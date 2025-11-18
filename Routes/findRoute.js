const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// Update user location
router.post('/update-user-location', async (req, res) => {
    try {
        console.log("Updating user location");
        const { userId, locationGeo } = req.body;
        
        if (!userId) {
            return res.send({ 
                status: 400, 
                message: "Missing required field: userId" 
            });
        }
        
        if (!locationGeo) {
            return res.send({ 
                status: 400, 
                message: "Missing required field: locationGeo" 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Initialize locationGeo if it doesn't exist
        if (!user.locationGeo) {
            user.locationGeo = {
                latitude: null,
                longitude: null,
                name: '',
                isEnabled: false
            };
        }
        
        // Update locationGeo
        if (locationGeo.latitude !== undefined) {
            user.locationGeo.latitude = locationGeo.latitude;
        }
        if (locationGeo.longitude !== undefined) {
            user.locationGeo.longitude = locationGeo.longitude;
        }
        if (locationGeo.name !== undefined) {
            user.locationGeo.name = locationGeo.name;
        }
        if (locationGeo.isEnabled !== undefined) {
            user.locationGeo.isEnabled = locationGeo.isEnabled;
        }
        
        user.updatedAt = new Date();
        await user.save();
        
        // Fetch updated user with all fields
        const updatedUser = await User.findById(userId)
            .select('name email phone bloodGroup location locationGeo availability totalDonations points isActive');
        
        res.send({ 
            status: 200, 
            message: locationGeo.isEnabled ? "Location updated successfully" : "Location sharing disabled",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user location:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Get users with location (for map view)
// Returns users with location enabled (current location) and users with location disabled (last known location)
router.get('/users-with-location', async (req, res) => {
    try {
        console.log("Fetching users with location");
        const { bloodGroup } = req.query;
        
        // Build query - include users with any location (enabled or disabled)
        // Users with isEnabled: true show current location, users with isEnabled: false show last location
        const query = {
            'locationGeo.latitude': { $exists: true, $ne: null },
            'locationGeo.longitude': { $exists: true, $ne: null },
            isActive: { $ne: false },
            availability: { $ne: 'Unavailable' }
        };
        
        if (bloodGroup && bloodGroup !== 'All') {
            query.bloodGroup = bloodGroup;
        }
        
        const users = await User.find(query)
            .select('name phone email bloodGroup location locationGeo totalDonations points availability isActive eligibilityDate')
            .sort({ totalDonations: -1, points: -1 });
        
        // Filter out users who are not eligible (eligibilityDate in the future)
        const now = new Date();
        const eligibleUsers = users.filter(user => {
            // If no eligibilityDate, they're eligible
            if (!user.eligibilityDate) return true;
            // If eligibilityDate is in the past or today, they're eligible
            return new Date(user.eligibilityDate) <= now;
        });
        
        // Format users for map
        const formattedUsers = eligibleUsers.map(user => ({
            _id: user._id,
            name: user.name,
            bloodGroup: user.bloodGroup,
            phone: user.phone || '',
            totalDonations: user.totalDonations || 0,
            points: user.points || 0,
            location: {
                latitude: user.locationGeo.latitude,
                longitude: user.locationGeo.longitude,
                name: user.locationGeo.name || user.location || user.address || 'Location'
            },
            locationEnabled: user.locationGeo.isEnabled
        }));
        
        res.send({ 
            status: 200, 
            users: formattedUsers,
            count: formattedUsers.length
        });
    } catch (error) {
        console.error("Error fetching users with location:", error);
        res.send({ status: 400, message: error.message });
    }
});

module.exports = router;

