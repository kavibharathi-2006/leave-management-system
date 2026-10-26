
const express = require("express");
const User = require("../models/User");
const Leave = require("../models/Leave");

const {
    isLoggedIn,
    isUser,
    isAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();

// DATE VALIDATION HELPER
function parseDateOnly(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
}

// APPLY FOR LEAVE - USER ONLY
router.post("/apply", isLoggedIn, isUser, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const userId = req.session.userId;

        if (
            !leaveType ||
            !startDate ||
            !endDate ||
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                message: "Please fill in all leave application fields."
            });
        }

        if (!["casual", "medical"].includes(leaveType)) {
            return res.status(400).json({
                message: "Please select a valid leave type."
            });
        }

        const start = parseDateOnly(startDate);
        const end = parseDateOnly(endDate);

        if (!start || !end) {
            return res.status(400).json({
                message: "Please select valid leave dates."
            });
        }

        // Get today's date using server's local calendar date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Past dates are not allowed
        if (start < today) {
            return res.status(400).json({
                message: "Past dates are not allowed. Select today or a future date."
            });
        }

        // End date must be on or after start date
        if (end < start) {
            return res.status(400).json({
                message: "End date cannot be before start date."
            });
        }

        // Calculate inclusive calendar days
        const startUTC = Date.UTC(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        );

        const endUTC = Date.UTC(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
        );

        const days = Math.round(
            (endUTC - startUTC) / (24 * 60 * 60 * 1000)
        ) + 1;

        if (days < 1) {
            return res.status(400).json({
                message: "Please select valid leave dates."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Get balance for the selected leave type
        const availableBalance = leaveType === "casual"
            ? Number(user.casualLeave)
            : Number(user.medicalLeave);

        // Count days from pending applications of the same type
        const pendingLeaves = await Leave.find({
            userId,
            leaveType,
            status: "Pending"
        });

        const pendingDays = pendingLeaves.reduce(
            (total, leave) => total + Number(leave.days || 0),
            0
        );

        const remainingBalance = Math.max(
            0,
            availableBalance - pendingDays
        );

        if (remainingBalance <= 0) {
            return res.status(400).json({
                message: `No ${leaveType} leave balance available.`
            });
        }

        if (days > remainingBalance) {
            return res.status(400).json({
                message: `You have only ${remainingBalance} available day(s) for ${leaveType} leave.`
            });
        }

        // Create leave application
        const leave = await Leave.create({
            userId,
            leaveType,
            startDate: start,
            endDate: end,
            days,
            reason: reason.trim()
        });

        return res.status(201).json({
            message: "Leave application submitted successfully.",
            leave
        });
    } catch (error) {
        console.error("Apply leave error:", error);

        return res.status(500).json({
            message: "Unable to apply for leave. Please try again."
        });
    }
});

// VIEW OWN LEAVE APPLICATIONS - USER ONLY
router.get("/my", isLoggedIn, isUser, async (req, res) => {
    try {
        const leaves = await Leave.find({
            userId: req.session.userId
        }).sort({ createdAt: -1 });

        return res.json(leaves);
    } catch (error) {
        console.error("Fetch user leaves error:", error);

        return res.status(500).json({
            message: "Unable to fetch leave applications."
        });
    }
});

// VIEW ALL APPLICATIONS - ADMIN ONLY
router.get("/admin/all", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate("userId", "username email rollNumber")
            .sort({ createdAt: -1 });

        return res.json(leaves);
    } catch (error) {
        console.error("Fetch all leaves error:", error);

        return res.status(500).json({
            message: "Unable to fetch leave applications."
        });
    }
});

// APPROVE OR REJECT - ADMIN ONLY
router.patch(
    "/admin/:leaveId",
    isLoggedIn,
    isAdmin,
    async (req, res) => {
        try {
            const { status, adminRemark = "" } = req.body;

            if (!["Approved", "Rejected"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be Approved or Rejected."
                });
            }

            if (
                typeof adminRemark !== "string" ||
                adminRemark.length > 300
            ) {
                return res.status(400).json({
                    message: "Admin remark must be 300 characters or fewer."
                });
            }

            const leave = await Leave.findById(req.params.leaveId);

            if (!leave) {
                return res.status(404).json({
                    message: "Leave application not found."
                });
            }

            if (leave.status !== "Pending") {
                return res.status(400).json({
                    message: "This application has already been reviewed."
                });
            }

            if (status === "Approved") {
                const user = await User.findById(leave.userId);

                if (!user) {
                    return res.status(404).json({
                        message: "Applicant not found."
                    });
                }

                const balanceField = leave.leaveType === "casual"
                    ? "casualLeave"
                    : "medicalLeave";

                if (Number(user[balanceField]) < Number(leave.days)) {
                    return res.status(400).json({
                        message: "Insufficient leave balance to approve."
                    });
                }

                user[balanceField] -= leave.days;
                await user.save();
            }

            leave.status = status;
            leave.adminRemark = adminRemark.trim();

            await leave.save();

            return res.json({
                message: `Leave ${status.toLowerCase()} successfully.`,
                leave
            });
        } catch (error) {
            console.error("Review leave error:", error);

            return res.status(500).json({
                message: "Unable to review leave application."
            });
        }
    }
);

module.exports = router;
