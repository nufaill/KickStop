const User = require("../models/userSchema");

const checkUserBlocked = async (req, res, next) => {
    try {
        const ignoredPaths = [
            '/login', 
            '/signup', 
            '/verify-otp', 
            '/resend-otp', 
            '/auth/google', 
            '/auth/google/callback',
            '/forgot-password',
            '/reset-password'
        ];

        if (ignoredPaths.includes(req.path)) {
            return next();
        }
        if (req.session && req.session.user) {
            const userId = req.session.user._id || req.session.user;
            const user = await User.findById(userId);
            
            if (user && user.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                    return res.redirect('/login');
                });
                return;
            }
        }
        next();
    } catch (error) {
        console.error("Error checking user block status:", error);
        res.status(500).send("Server error");
    }
};

module.exports = checkUserBlocked;