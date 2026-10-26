
const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    leaveType: {
        type: String,
        enum: ["casual", "medical"],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    days: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    adminRemark: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Leave", leaveSchema);
