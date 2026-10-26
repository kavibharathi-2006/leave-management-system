
const express = require("express");
const session = require("express-session");
const path = require("path");
const connectDB = require("./config/db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
    console.error(
        "Server startup failed: SESSION_SECRET environment variable is required."
    );
    process.exit(1);
}

app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        message: "SmartLeavePortal server is running"
    });
});

async function createAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.log(
            "Admin setup skipped: configure ADMIN_EMAIL and ADMIN_PASSWORD."
        );
        return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
        email: normalizedEmail
    });

    if (existingUser) {
        if (existingUser.role !== "admin") {
            throw new Error(
                "Admin email is already registered as a user."
            );
        }

        console.log("Admin account already exists.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
        username: "Administrator",
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin"
    });

    console.log("Initial admin account created.");
}

async function startServer() {
    try {
        await connectDB();
        await createAdmin();

        app.listen(PORT, () => {
            console.log(
                `SmartLeavePortal running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
