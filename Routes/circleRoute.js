const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// Get user by ID (to fetch circle data)
router.get('/users/:userId', async (req, res) => {
    try {
        console.log("Fetching user data");
        const { userId } = req.params;
        
        const user = await User.findById(userId)
            .populate('circle.userId', 'name phone email bloodGroup location district thana lastDonation totalDonations')
            .select('name email phone bloodGroup circle');
        
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        res.send({ 
            status: 200, 
            user: user
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Search user by phone number
router.post('/search-user-by-phone', async (req, res) => {
    try {
        console.log("Searching user by phone");
        const { phone } = req.body;
        
        if (!phone) {
            return res.send({ 
                status: 400, 
                message: "Phone number is required" 
            });
        }
        
        // Validate Bangladesh phone number format (01XXXXXXXXX)
        if (!/^01[3-9]\d{8}$/.test(phone)) {
            return res.send({ 
                status: 400, 
                message: "Invalid phone number format. Please enter a valid Bangladesh phone number (e.g., 01712345678)" 
            });
        }
        
        const user = await User.findOne({ phone: phone })
            .select('name phone email bloodGroup location address district thana age lastDonation totalDonations points');
        
        if (!user) {
            return res.send({ 
                status: 404, 
                message: "No user found with this phone number" 
            });
        }
        
        res.send({ 
            status: 200, 
            user: user
        });
    } catch (error) {
        console.error("Error searching user by phone:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Add user to circle
router.post('/add-to-circle', async (req, res) => {
    try {
        console.log("Adding user to circle");
        const { 
            userId, 
            connectionUserId, 
            connectionName, 
            connectionPhone, 
            connectionBloodGroup,
            connectionLocation 
        } = req.body;
        
        if (!userId || !connectionUserId || !connectionName || !connectionPhone || !connectionBloodGroup) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, connectionUserId, connectionName, connectionPhone, connectionBloodGroup" 
            });
        }
        
        // Find the user who is adding to circle
        const user = await User.findById(userId);
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Find the connection user
        const connectionUser = await User.findById(connectionUserId);
        if (!connectionUser) {
            return res.send({ status: 404, message: "Connection user not found" });
        }
        
        // Check if already in circle
        const alreadyInCircle = user.circle.some(
            connection => connection.userId.toString() === connectionUserId.toString()
        );
        
        if (alreadyInCircle) {
            return res.send({ 
                status: 400, 
                message: "This user is already in your circle" 
            });
        }
        
        // Prevent adding yourself
        if (userId === connectionUserId) {
            return res.send({ 
                status: 400, 
                message: "You cannot add yourself to your circle" 
            });
        }
        
        // Add to user's circle
        user.circle.push({
            userId: connectionUserId,
            name: connectionName,
            phone: connectionPhone,
            bloodGroup: connectionBloodGroup,
            location: connectionLocation || connectionUser.location || '',
            lastDonation: connectionUser.lastDonation || '',
            totalDonations: connectionUser.totalDonations || 0,
            addedAt: new Date()
        });
        
        user.updatedAt = new Date();
        await user.save();
        
        // Optionally add the user to the connection's circle as well (bidirectional)
        const userInConnectionCircle = connectionUser.circle.some(
            connection => connection.userId.toString() === userId.toString()
        );
        
        if (!userInConnectionCircle) {
            connectionUser.circle.push({
                userId: userId,
                name: user.name,
                phone: user.phone || '',
                bloodGroup: user.bloodGroup,
                location: user.location || '',
                lastDonation: user.lastDonation || '',
                totalDonations: user.totalDonations || 0,
                addedAt: new Date()
            });
            connectionUser.updatedAt = new Date();
            await connectionUser.save();
        }
        
        // Fetch updated user with populated circle
        const updatedUser = await User.findById(userId)
            .populate('circle.userId', 'name phone email bloodGroup location district thana lastDonation totalDonations')
            .select('name email phone bloodGroup circle');
        
        res.send({ 
            status: 200, 
            message: "User added to circle successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error adding user to circle:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Remove user from circle
router.post('/remove-from-circle', async (req, res) => {
    try {
        console.log("Removing user from circle");
        const { userId, connectionUserId } = req.body;
        
        if (!userId || !connectionUserId) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, connectionUserId" 
            });
        }
        
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Find the connection in circle
        const connectionIndex = user.circle.findIndex(
            connection => connection.userId.toString() === connectionUserId.toString()
        );
        
        if (connectionIndex === -1) {
            return res.send({ 
                status: 404, 
                message: "User not found in your circle" 
            });
        }
        
        // Remove from circle
        user.circle.splice(connectionIndex, 1);
        user.updatedAt = new Date();
        await user.save();
        
        // Optionally remove from the connection's circle as well (bidirectional)
        const connectionUser = await User.findById(connectionUserId);
        if (connectionUser) {
            const userIndex = connectionUser.circle.findIndex(
                connection => connection.userId.toString() === userId.toString()
            );
            
            if (userIndex !== -1) {
                connectionUser.circle.splice(userIndex, 1);
                connectionUser.updatedAt = new Date();
                await connectionUser.save();
            }
        }
        
        // Fetch updated user with populated circle
        const updatedUser = await User.findById(userId)
            .populate('circle.userId', 'name phone email bloodGroup location district thana lastDonation totalDonations')
            .select('name email phone bloodGroup circle');
        
        res.send({ 
            status: 200, 
            message: "User removed from circle successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error removing user from circle:", error);
        res.send({ status: 400, message: error.message });
    }
});

module.exports = router;

