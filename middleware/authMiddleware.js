
function isLoggedIn(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    next();
}

function isUser(req, res, next) {
    if (!req.session || req.session.role !== "user") {
        return res.status(403).json({
            message: "User access only"
        });
    }

    next();
}

function isAdmin(req, res, next) {
    if (!req.session || req.session.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    next();
}

module.exports = {
    isLoggedIn,
    isUser,
    isAdmin
};
