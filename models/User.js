
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    rollNumber: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    casualLeave: {
        type: Number,
        default: 10
    },
    medicalLeave: {
        type: Number,
        default: 10
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
