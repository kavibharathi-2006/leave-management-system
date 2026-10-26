
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// USER REGISTRATION
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, rollNumber } = req.body;

        if (!username || !email || !password || !rollNumber) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            rollNumber: rollNumber.trim(),
            role: "user"
        });

        res.status(201).json({
            message: "Registration successful",
            userId: user._id
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// USER LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
            role: "user"
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        req.session.userId = user._id.toString();
        req.session.role = "user";

        res.json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role,
                casualLeave: user.casualLeave,
                medicalLeave: user.medicalLeave
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

// GET CURRENT LOGGED-IN USER
router.get("/me", async (req, res) => {
    try {
        if (!req.session ||
            !req.session.userId ||
            req.session.role !== "user") {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const user = await User.findById(
            req.session.userId
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role,
                casualLeave: user.casualLeave,
                medicalLeave: user.medicalLeave
            }
        });
    } catch (error) {
        console.error("Fetch user error:", error.message);

        res.status(500).json({
            message: "Unable to fetch user details"
        });
    }
});

// LOGOUT
router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({
            message: "Logout successful"
        });
    }

    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logout successful"
        });
    });
});

module.exports = router;
