const express = require('express');
const router = express.Router();
const User = require('../models/userModel');


router.get('/users', async (req, res) => {
    const users = await User.find({});
    res.send(users);
})

router.post('/register', async (req, res) => {
    console.log("Register Triggered");
    const { 
        name, 
        email, 
        password, 
        phone, 
        age, 
        address, 
        district,
        thana,
        location,
        locationGeo,
        bloodGroup,
        weight,
        availability,
        healthStatus
    } = req.body;

    const userExists = await User.findOne({ email: email });// Check if user already exists

    if (!userExists) {
        const newUser = new User({
            name: name,
            email: email,
            password: password,
            phone: phone,
            age: age,
            address: address,
            district: district,
            thana: thana,
            location: location,
            locationGeo: locationGeo,
            bloodGroup: bloodGroup,
            weight: weight,
            availability: availability,
            healthStatus: healthStatus
        })
        
        try {
            await newUser.save();
            res.send({ status: 200, user: newUser });
        } catch (error) {
            console.error("Registration error:", error);
            res.send({ status: 400, message: error.message });
        }
    } else {
        res.send({ status: 400, message: "User already exists with this email" });
    }
    console.log("Register completed");
})

router.post('/login', async (req, res) => {
    console.log("Login triggered")
    const { email, password } = req.body;
    console.log(email);
    const user = await User.findOne({ email: email, password: password });
    if (user) {
        console.log(user);
        res.send({ status: 200, user: user });
    } else {
        console.log("Not found");
        res.send({ status: 400, message: "Invalid email or password" });
    }
    console.log("Login completed");
})

module.exports = router;