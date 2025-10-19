const express = require('express');
const router = express.Router();
const User = require('../models/userModel');


router.get('/users', async (req, res) => {
    const users = await User.find({});
    res.send(users);
})

router.post('/register', async (req, res) => {
    console.log("Register Triggered");
    const { name, email, password, phone, age, address, bloodGroup } = req.body;

    const userExists = await User.findOne({ email: email });// Check if user already exists

    if (!userExists) {
        const newUser = User({
            name: name,
            email: email,
            password: password,
            phone: phone,
            age: age,
            address: address,
            bloodGroup: bloodGroup
        })
        newUser.save()
        .then(res.send({ status: 200 ,user: newUser}))
    } else {
        res.send({ status: 400, message: "User already exists with this email" });
    }
})

router.post('/login', async (req, res) => {
    console.log("Login trigered")
    const { email, password } = req.body;
    console.log(email, password);
    const user = await User.findOne({ email: email, password: password });
    if (user) {
        console.log(user);
        res.send({ status: 200, user: user });
    } else {
        console.log("Not found");
        res.send({ status: 400, message: "Invalid email or password" });
    }

})

module.exports = router;