const mongoose = require("mongoose");

const userSchema = mongoose.Schema({

    name: { type: String },
    email: { type: String },
    password: { type: String },
    phone: { type: String },
    age: { type: Number },
    address: { type: String },
    bloodGroup: { type: String },
    eligibility: { type: Boolean, default: true },
    points: { type: Number, default: 0 },
    totalDonations: { type: Number, default: 0 },
    donationHistory: { type: Array, default: [] },
    bloodRequests: { type: Array, default: [] },//People who requested me for blood
    bloodRequested: { type: Array, default: [] }//People I requested for blood

})

module.exports =new mongoose.model("User", userSchema);