const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const mongoose = require('mongoose');

// Get all available blood requests (not accepted yet)
router.get('/blood-requests', async (req, res) => {
    try {
        console.log("Fetching available blood requests");
        const { bloodGroup, district, thana } = req.query;
        
        // Build query filter
        const query = {};
        if (bloodGroup) query['bloodRequests.bloodGroup'] = bloodGroup;
        if (district) query['bloodRequests.district'] = district;
        if (thana) query['bloodRequests.thana'] = thana;
        
        // Find all users with blood requests
        const users = await User.find({
            'bloodRequests.0': { $exists: true } // Users who have at least one blood request
        }).select('name email phone bloodGroup district thana location bloodRequests');
        
        // Filter and flatten blood requests
        let allRequests = [];
        users.forEach(user => {
            user.bloodRequests.forEach(request => {
                // Only include non-accepted requests
                if (!request.isAccepted) {
                    // Apply filters if provided
                    let include = true;
                    if (bloodGroup && request.bloodGroup !== bloodGroup) include = false;
                    if (district && request.district !== district) include = false;
                    if (thana && request.thana !== thana) include = false;
                    
                    if (include) {
                        allRequests.push({
                            _id: request._id,
                            requesterId: user._id,
                            requesterName: user.name,
                            requesterPhone: user.phone,
                            requesterEmail: user.email,
                            requesterBloodGroup: user.bloodGroup,
                            requesterLocation: user.location,
                            bloodGroup: request.bloodGroup,
                            date: request.date,
                            time: request.time,
                            phone: request.phone,
                            district: request.district,
                            thana: request.thana,
                            location: request.location,
                            isAccepted: request.isAccepted,
                            createdAt: request.createdAt
                        });
                    }
                }
            });
        });
        
        // Sort by creation date (newest first)
        allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.send({ status: 200, requests: allRequests, count: allRequests.length });
    } catch (error) {
        console.error("Error fetching blood requests:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Accept a blood request (when donor accepts to donate)
router.post('/accept-request', async (req, res) => {
    try {
        console.log("Accepting blood request");
        const { requesterId, requestId, donorId } = req.body;
        
        if (!requesterId || !requestId || !donorId) {
            return res.send({ status: 400, message: "Missing required fields: requesterId, requestId, donorId" });
        }
        
        // Find the requester
        const requester = await User.findById(requesterId);
        if (!requester) {
            return res.send({ status: 404, message: "Requester not found" });
        }
        
        // Find the donor
        const donor = await User.findById(donorId);
        if (!donor) {
            return res.send({ status: 404, message: "Donor not found" });
        }
        
        // Find the specific request
        const request = requester.bloodRequests.id(requestId);
        if (!request) {
            return res.send({ status: 404, message: "Blood request not found" });
        }
        
        if (request.isAccepted) {
            return res.send({ status: 400, message: "This request has already been accepted" });
        }
        
        // Update the request
        request.isAccepted = true;
        request.acceptedBy = donorId;
        request.acceptedByName = donor.name;
        
        // Add to donor's donation history
        donor.donationHistory.push({
            name: requester.name,
            bloodGroup: request.bloodGroup,
            date: request.date,
            location: request.location,
            recipientId: requesterId
        });
        
        // Update donor stats
        donor.totalDonations = (donor.totalDonations || 0) + 1;
        donor.points = (donor.points || 0) + 10; // Award points for donation
        donor.lastDonation = request.date;
        donor.updatedAt = new Date();
        
        // Save both users
        await requester.save();
        await donor.save();
        
        res.send({ 
            status: 200, 
            message: "Blood request accepted successfully",
            request: request,
            donor: {
                name: donor.name,
                totalDonations: donor.totalDonations,
                points: donor.points
            }
        });
    } catch (error) {
        console.error("Error accepting blood request:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Get donation history for a user
router.get('/donation-history/:userId', async (req, res) => {
    try {
        console.log("Fetching donation history");
        const { userId } = req.params;
        
        const user = await User.findById(userId)
            .select('name donationHistory totalDonations points lastDonation');
        
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Get donation history and convert to plain objects
        let donationHistory = (user.donationHistory || []).map(donation => {
            // Convert subdocument to plain object
            const donationObj = donation.toObject ? donation.toObject() : donation;
            return {
                _id: donationObj._id || donationObj.id || null,
                name: donationObj.name || '',
                bloodGroup: donationObj.bloodGroup || '',
                date: donationObj.date || '',
                location: donationObj.location || '',
                recipientId: donationObj.recipientId || null
            };
        });
        
        console.log(`Found ${donationHistory.length} donation history entries`);
        
        // Populate recipient information if recipientId exists
        const populatedHistory = await Promise.all(
            donationHistory.map(async (donation) => {
                if (donation.recipientId) {
                    try {
                        const recipient = await User.findById(donation.recipientId)
                            .select('name phone email bloodGroup location');
                        return {
                            _id: donation._id,
                            name: donation.name,
                            bloodGroup: donation.bloodGroup,
                            date: donation.date,
                            location: donation.location,
                            recipientId: donation.recipientId,
                            recipient: recipient ? {
                                name: recipient.name,
                                phone: recipient.phone,
                                email: recipient.email,
                                bloodGroup: recipient.bloodGroup,
                                location: recipient.location
                            } : null
                        };
                    } catch (err) {
                        console.error("Error populating recipient:", err);
                        return {
                            _id: donation._id,
                            name: donation.name,
                            bloodGroup: donation.bloodGroup,
                            date: donation.date,
                            location: donation.location,
                            recipientId: donation.recipientId,
                            recipient: null
                        };
                    }
                } else {
                    return {
                        _id: donation._id,
                        name: donation.name,
                        bloodGroup: donation.bloodGroup,
                        date: donation.date,
                        location: donation.location,
                        recipientId: null,
                        recipient: null
                    };
                }
            })
        );
        
        // Sort by date (newest first)
        populatedHistory.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            // Try to parse dates
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                // If dates can't be parsed, sort by string
                return b.date.localeCompare(a.date);
            }
            return dateB - dateA;
        });
        
        console.log(`Returning ${populatedHistory.length} donation history entries`);
        
        res.send({ 
            status: 200, 
            donationHistory: populatedHistory,
            totalDonations: user.totalDonations || 0,
            points: user.points || 0,
            lastDonation: user.lastDonation || null
        });
    } catch (error) {
        console.error("Error fetching donation history:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Get available donors for a specific blood group and location
router.get('/available-donors', async (req, res) => {
    try {
        console.log("Fetching available donors");
        const { bloodGroup, district, thana } = req.query;
        
        if (!bloodGroup) {
            return res.send({ status: 400, message: "Blood group is required" });
        }
        
        // Build query
        const query = {
            bloodGroup: bloodGroup,
            availability: { $ne: 'Unavailable' },
            isActive: true
        };
        
        if (district) query.district = district;
        if (thana) query.thana = thana;
        
        const donors = await User.find(query)
            .select('name phone email bloodGroup district thana location availability totalDonations points lastDonation eligibilityDate')
            .sort({ totalDonations: -1, points: -1 }); // Sort by experience (total donations) and points
        
        // Filter out donors who are not eligible (eligibilityDate in the future)
        const now = new Date();
        const eligibleDonors = donors.filter(donor => {
            // If no eligibilityDate, they're eligible
            if (!donor.eligibilityDate) return true;
            // If eligibilityDate is in the past or today, they're eligible
            return new Date(donor.eligibilityDate) <= now;
        });
        
        res.send({ 
            status: 200, 
            donors: eligibleDonors,
            count: eligibleDonors.length
        });
    } catch (error) {
        console.error("Error fetching available donors:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Get user's own blood requests
router.get('/my-blood-requests/:userId', async (req, res) => {
    try {
        console.log("Fetching user's blood requests");
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('name bloodRequests');
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        res.send({ 
            status: 200, 
            bloodRequests: user.bloodRequests || [],
            count: user.bloodRequests?.length || 0
        });
    } catch (error) {
        console.error("Error fetching user's blood requests:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Create a new blood request
router.post('/create-blood-request', async (req, res) => {
    try {
        console.log("Creating blood request");
        const { 
            userId, 
            bloodGroup, 
            date, 
            time, 
            phone, 
            district, 
            thana, 
            location 
        } = req.body;
        
        if (!userId || !bloodGroup || !date || !time || !phone || !district || !thana || !location) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, bloodGroup, date, time, phone, district, thana, location" 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Add new blood request
        user.bloodRequests.push({
            bloodGroup: bloodGroup,
            date: date,
            time: time,
            phone: phone,
            district: district,
            thana: thana,
            location: location,
            isAccepted: false,
            acceptedBy: null,
            acceptedByName: null,
            createdAt: new Date()
        });
        
        user.updatedAt = new Date();
        await user.save();
        
        const newRequest = user.bloodRequests[user.bloodRequests.length - 1];
        
        res.send({ 
            status: 200, 
            message: "Blood request created successfully",
            request: newRequest
        });
    } catch (error) {
        console.error("Error creating blood request:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Delete a blood request
router.delete('/delete-blood-request', async (req, res) => {
    try {
        console.log("Deleting blood request");
        const { userId, requestId } = req.body;
        
        if (!userId || !requestId) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, requestId" 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Find the specific request
        const request = user.bloodRequests.id(requestId);
        if (!request) {
            return res.send({ status: 404, message: "Blood request not found" });
        }
        
        // Check if request has been accepted
        if (request.isAccepted) {
            return res.send({ 
                status: 400, 
                message: "Cannot delete an accepted blood request. Please contact support if needed." 
            });
        }
        
        // Remove the request from the array
        user.bloodRequests.pull(requestId);
        user.updatedAt = new Date();
        await user.save();
        
        res.send({ 
            status: 200, 
            message: "Blood request deleted successfully",
            deletedRequestId: requestId
        });
    } catch (error) {
        console.error("Error deleting blood request:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Send connection request to donor
router.post('/send-request-to-donor', async (req, res) => {
    try {
        console.log("Sending connection request to donor");
        const { 
            requesterId, 
            requesterName, 
            donorId, 
            donorName, 
            requestId, 
            bloodGroup, 
            date, 
            time, 
            location, 
            district, 
            thana, 
            phone 
        } = req.body;
        
        if (!requesterId || !requesterName || !donorId || !donorName || !requestId || !bloodGroup || !date || !time || !location || !district || !thana || !phone) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: requesterId, requesterName, donorId, donorName, requestId, bloodGroup, date, time, location, district, thana, phone" 
            });
        }
        
        // Find requester and donor
        const requester = await User.findById(requesterId);
        const donor = await User.findById(donorId);
        
        if (!requester) {
            return res.send({ status: 404, message: "Requester not found" });
        }
        if (!donor) {
            return res.send({ status: 404, message: "Donor not found" });
        }
        
        // Verify the blood request exists
        const bloodRequest = requester.bloodRequests.id(requestId);
        if (!bloodRequest) {
            return res.send({ status: 404, message: "Blood request not found" });
        }
        
        // Check if request is already accepted
        if (bloodRequest.isAccepted) {
            return res.send({ 
                status: 400, 
                message: "This blood request has already been accepted" 
            });
        }
        
        // Check if already sent a connection request for this blood request
        const existingRequest = donor.connectionRequests.find(
            req => req.requesterId.toString() === requesterId && 
                   req.requestId.toString() === requestId && 
                   req.status === 'pending'
        );
        
        if (existingRequest) {
            return res.send({ 
                status: 400, 
                message: "You have already sent a connection request for this blood request" 
            });
        }
        
        // Add connection request to donor
        donor.connectionRequests.push({
            requesterId: requesterId,
            requesterName: requesterName,
            requesterPhone: requester.phone || '',
            requestId: requestId,
            bloodGroup: bloodGroup,
            date: date,
            time: time,
            location: location,
            district: district,
            thana: thana,
            phone: phone,
            status: 'pending',
            createdAt: new Date()
        });
        
        donor.updatedAt = new Date();
        await donor.save();
        
        const newRequest = donor.connectionRequests[donor.connectionRequests.length - 1];
        
        res.send({ 
            status: 200, 
            message: "Connection request sent successfully",
            connectionRequest: newRequest
        });
    } catch (error) {
        console.error("Error sending connection request:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Get connection requests for a user (requests received)
router.get('/connection-requests/:userId', async (req, res) => {
    try {
        console.log("Fetching connection requests");
        const { userId } = req.params;
        const { status } = req.query; // Optional filter: 'pending', 'accepted', 'rejected'
        
        const user = await User.findById(userId).select('name connectionRequests');
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Filter connection requests by status if provided
        let requests = user.connectionRequests || [];
        if (status) {
            requests = requests.filter(req => req.status === status);
        }
        
        // Sort by creation date (newest first)
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.send({ 
            status: 200, 
            connectionRequests: requests,
            count: requests.length
        });
    } catch (error) {
        console.error("Error fetching connection requests:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Accept a connection request
router.post('/accept-connection-request', async (req, res) => {
    try {
        console.log("Accepting connection request");
        const { userId, requestId } = req.body;
        
        if (!userId || !requestId) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, requestId" 
            });
        }
        
        // Find the user (donor who received the request)
        const donor = await User.findById(userId);
        if (!donor) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Check eligibility - user must be eligible to donate
        const now = new Date();
        if (donor.eligibilityDate && new Date(donor.eligibilityDate) > now) {
            const daysRemaining = Math.ceil((new Date(donor.eligibilityDate) - now) / (1000 * 60 * 60 * 24));
            return res.send({ 
                status: 400, 
                message: `You are not eligible to donate yet. You can donate again in ${daysRemaining} day(s) (after ${new Date(donor.eligibilityDate).toLocaleDateString()}).` 
            });
        }
        
        // Check if availability is set to Unavailable
        if (donor.availability === 'Unavailable' && donor.eligibilityDate && new Date(donor.eligibilityDate) > now) {
            return res.send({ 
                status: 400, 
                message: "You are currently unavailable to donate blood. Please wait until your eligibility period ends." 
            });
        }
        
        // Find the connection request
        const connectionRequest = donor.connectionRequests.id(requestId);
        if (!connectionRequest) {
            return res.send({ status: 404, message: "Connection request not found" });
        }
        
        if (connectionRequest.status !== 'pending') {
            return res.send({ 
                status: 400, 
                message: `This request has already been ${connectionRequest.status}` 
            });
        }
        
        // Find the requester
        const requester = await User.findById(connectionRequest.requesterId);
        if (!requester) {
            return res.send({ status: 404, message: "Requester not found" });
        }
        
        // Find the blood request
        const bloodRequest = requester.bloodRequests.id(connectionRequest.requestId);
        if (!bloodRequest) {
            return res.send({ status: 404, message: "Blood request not found" });
        }
        
        // Check if blood request is already accepted
        if (bloodRequest.isAccepted) {
            return res.send({ 
                status: 400, 
                message: "This blood request has already been accepted by someone else" 
            });
        }
        
        // Accept the blood request
        bloodRequest.isAccepted = true;
        bloodRequest.acceptedBy = userId;
        bloodRequest.acceptedByName = donor.name;
        
        // Update connection request status
        connectionRequest.status = 'accepted';
        
        // Add to donor's donation history
        donor.donationHistory.push({
            name: requester.name,
            bloodGroup: connectionRequest.bloodGroup,
            date: connectionRequest.date,
            location: connectionRequest.location,
            recipientId: connectionRequest.requesterId
        });
        
        // Update donor stats
        donor.totalDonations = (donor.totalDonations || 0) + 1;
        donor.points = (donor.points || 0) + 50; // Award 50 points as mentioned in frontend
        donor.lastDonation = connectionRequest.date;
        
        // Set eligibility date to 4 months from now
        const eligibilityDate = new Date();
        eligibilityDate.setMonth(eligibilityDate.getMonth() + 4);
        donor.eligibilityDate = eligibilityDate;
        
        // Set availability to Unavailable during the 4-month period
        donor.availability = 'Unavailable';
        
        // Add to donor's accepted connections (separate from circle)
        const alreadyInAcceptedConnections = donor.acceptedConnections.some(
            conn => conn.userId.toString() === connectionRequest.requesterId.toString() &&
                    conn.bloodRequestId.toString() === connectionRequest.requestId.toString()
        );
        
        if (!alreadyInAcceptedConnections) {
            donor.acceptedConnections.push({
                userId: connectionRequest.requesterId,
                name: requester.name,
                phone: requester.phone || '',
                bloodGroup: requester.bloodGroup,
                connectionRequestId: requestId,
                bloodRequestId: connectionRequest.requestId,
                acceptedAt: new Date()
            });
        }
        
        // Add to requester's accepted connections (to track who helped them)
        const donorInRequesterAccepted = requester.acceptedConnections.some(
            conn => conn.userId.toString() === userId.toString() &&
                    conn.bloodRequestId.toString() === connectionRequest.requestId.toString()
        );
        
        if (!donorInRequesterAccepted) {
            requester.acceptedConnections.push({
                userId: userId,
                name: donor.name,
                phone: donor.phone || '',
                bloodGroup: donor.bloodGroup,
                connectionRequestId: requestId,
                bloodRequestId: connectionRequest.requestId,
                acceptedAt: new Date()
            });
        }
        
        donor.updatedAt = new Date();
        
        requester.updatedAt = new Date();
        
        // Save all changes
        await donor.save();
        await requester.save();
        
        res.send({ 
            status: 200, 
            message: "Connection request accepted successfully",
            connectionRequest: connectionRequest,
            bloodRequest: {
                _id: bloodRequest._id,
                isAccepted: bloodRequest.isAccepted,
                acceptedBy: bloodRequest.acceptedBy,
                acceptedByName: bloodRequest.acceptedByName
            },
            donor: {
                name: donor.name,
                totalDonations: donor.totalDonations,
                points: donor.points,
                availability: donor.availability,
                eligibilityDate: donor.eligibilityDate
            }
        });
    } catch (error) {
        console.error("Error accepting connection request:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Check eligibility status for a user
router.get('/eligibility-status/:userId', async (req, res) => {
    try {
        console.log("Checking eligibility status");
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('name availability eligibilityDate lastDonation');
        if (!user) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        const now = new Date();
        let isEligible = true;
        let daysRemaining = 0;
        let eligibilityDate = null;
        
        if (user.eligibilityDate && new Date(user.eligibilityDate) > now) {
            isEligible = false;
            daysRemaining = Math.ceil((new Date(user.eligibilityDate) - now) / (1000 * 60 * 60 * 24));
            eligibilityDate = user.eligibilityDate;
        } else if (user.eligibilityDate && new Date(user.eligibilityDate) <= now) {
            // Eligibility period has ended, user can donate again
            isEligible = true;
            // Optionally update availability back to Available
            if (user.availability === 'Unavailable') {
                user.availability = 'Available';
                user.eligibilityDate = null; // Clear eligibility date
                await user.save();
            }
        }
        
        res.send({ 
            status: 200, 
            isEligible: isEligible,
            availability: user.availability,
            eligibilityDate: eligibilityDate,
            daysRemaining: daysRemaining,
            lastDonation: user.lastDonation,
            message: isEligible 
                ? "You are eligible to donate blood." 
                : `You are not eligible to donate yet. You can donate again in ${daysRemaining} day(s) (after ${new Date(eligibilityDate).toLocaleDateString()}).`
        });
    } catch (error) {
        console.error("Error checking eligibility status:", error);
        res.send({ status: 400, message: error.message });
    }
});

// Reject a connection request
router.post('/reject-connection-request', async (req, res) => {
    try {
        console.log("Rejecting connection request");
        const { userId, requestId } = req.body;
        
        if (!userId || !requestId) {
            return res.send({ 
                status: 400, 
                message: "Missing required fields: userId, requestId" 
            });
        }
        
        // Find the user (donor who received the request)
        const donor = await User.findById(userId);
        if (!donor) {
            return res.send({ status: 404, message: "User not found" });
        }
        
        // Find the connection request
        const connectionRequest = donor.connectionRequests.id(requestId);
        if (!connectionRequest) {
            return res.send({ status: 404, message: "Connection request not found" });
        }
        
        if (connectionRequest.status !== 'pending') {
            return res.send({ 
                status: 400, 
                message: `This request has already been ${connectionRequest.status}` 
            });
        }
        
        // Update connection request status
        connectionRequest.status = 'rejected';
        donor.updatedAt = new Date();
        await donor.save();
        
        res.send({ 
            status: 200, 
            message: "Connection request rejected successfully",
            connectionRequest: {
                _id: connectionRequest._id,
                status: connectionRequest.status
            }
        });
    } catch (error) {
        console.error("Error rejecting connection request:", error);
        res.send({ status: 400, message: error.message });
    }
});

module.exports = router;

