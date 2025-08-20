const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

router.post('/register', async (req, res) => {
        const {name,email,password,phone,age,address,bloodGroup} = req.body;
        const newUser=User({
            name:name,
            email:email,
            password:password,
            phone:phone,
            age:age,
            address:address,
            bloodGroup:bloodGroup
        })
        newUser.save()
        .then(res.send(newUser))
})

module.exports = router;