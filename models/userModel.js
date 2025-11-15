const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({

    name: { type: String, required: true },

    email: { type: String, unique: true, required: true },

    password: { type: String, required: true },

    phone: { type: String },

    address: { type: String },

    district: { type: String },

    thana: { type: String },

    location: { type: String },

    locationGeo: {

      latitude: Number,

      longitude: Number,

      name: String,

      isEnabled: { type: Boolean, default: false }

    },

    bloodGroup: {

      type: String,

      enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],

      required: true

    },

    age: Number,

    weight: Number,

    availability: { type: String, default: 'Available' },

    healthStatus: { type: String },

    lastDonation: { type: String },

    eligibilityDate: { type: Date }, // Date when user becomes eligible to donate again (4 months after donation)

    totalDonations: { type: Number, default: 0 },

    points: { type: Number, default: 0 },

    donationHistory: [{

      _id: { type: Schema.Types.ObjectId, auto: true },

      name: String,

      bloodGroup: String,

      date: String,

      location: String,

      recipientId: { type: Schema.Types.ObjectId, ref: 'User' }

    }],

    bloodRequests: [{

      _id: { type: Schema.Types.ObjectId, auto: true },

      bloodGroup: {

        type: String,

        enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],

        required: true

      },

      date: { type: String, required: true },

      time: { type: String, required: true },

      phone: { type: String, required: true },

      district: { type: String, required: true },

      thana: { type: String, required: true },

      location: { type: String, required: true },

      isAccepted: { type: Boolean, default: false },

      acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

      acceptedByName: { type: String },

      createdAt: { type: Date, default: Date.now }

    }],

    connectionRequests: [{

      _id: { type: Schema.Types.ObjectId, auto: true },

      requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

      requesterName: { type: String, required: true },

      requesterPhone: { type: String },

      requestId: { type: Schema.Types.ObjectId, required: true },

      bloodGroup: {

        type: String,

        enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],

        required: true

      },

      date: { type: String, required: true },

      time: { type: String, required: true },

      location: { type: String, required: true },

      district: { type: String, required: true },

      thana: { type: String, required: true },

      phone: { type: String, required: true },

      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },

      createdAt: { type: Date, default: Date.now }

    }],

    acceptedConnections: [{

      _id: { type: Schema.Types.ObjectId, auto: true },

      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

      name: { type: String, required: true },

      phone: { type: String },

      bloodGroup: { type: String },

      connectionRequestId: { type: Schema.Types.ObjectId, required: true },

      bloodRequestId: { type: Schema.Types.ObjectId, required: true },

      acceptedAt: { type: Date, default: Date.now }

    }],

    circle: [{

      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

      name: { type: String, required: true },

      phone: { type: String, required: true },

      bloodGroup: {

        type: String,

        enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'],

        required: true

      },

      location: { type: String },

      lastDonation: { type: String },

      totalDonations: { type: Number, default: 0 },

      addedAt: { type: Date, default: Date.now }

    }],

    role: { type: String, default: 'user' },

    isActive: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },

    updatedAt: { type: Date, default: Date.now }

  }, { collection: 'users' });


module.exports = new mongoose.model("User", userSchema); 