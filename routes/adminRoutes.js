
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// ADMIN LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const admin = await User.findOne({
            email: email.trim().toLowerCase(),
            role: "admin"
        });

        if (!admin) {
            return res.status(401).json({
                message: "Invalid admin credentials"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid admin credentials"
            });
        }

        // CREATE ADMIN SESSION
        req.session.userId = admin._id.toString();
        req.session.role = "admin";

        res.json({
            message: "Admin login successful",
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error("Admin login error:", error.message);

        res.status(500).json({
            message: "Admin login failed"
        });
    }
});

module.exports = router;
