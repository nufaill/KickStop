const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const pageError = async (req, res) => {
    try {

        res.render('error-page')

    } catch (error) {

    }
}


const loadLogin = (req, res) => {
    try {
        // If admin is already logged in (session exists), redirect to dashboard
        if (req.session.admin) {
            return res.redirect("/admin");
        }
        // Otherwise show login page
        res.render("admin-login", { message: null });
    } catch (error) {
        console.error("Error in loadLogin:", error);
        res.redirect("/admin/pageerror");
    }
};

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });
        
        if (!admin) {
            return res.render("admin-login", { errorMessage: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        
        if (!isPasswordValid) {
            return res.render("admin-login", { errorMessage: "Invalid credentials" });
        }

        req.session.admin = admin;
        req.session.adminExpiresAt = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
        
        res.redirect("/admin/");
        
    } catch (error) {
        console.error("Login error:", error);
        res.render("admin-login", { errorMessage: "An error occurred during login" });
    }
}


// const loadDashboard = async (req, res) => {
//     try {
//         if (!req.session.admin || (req.session.adminExpiresAt && Date.now() > req.session.adminExpiresAt)) {
//             if (req.session) {
//                 req.session.destroy();
//             }
//             return res.redirect("/admin/login");
//         }
//         res.render("dashboard");
//     } catch (error) {
//         console.error("Error loading dashboard:", error);
//         res.redirect('/pageerror');
//     }
// };



const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroying session", err);
                return res.redirect("/error");
            }
            res.redirect("/admin/login");
        });
    } catch (error) {
        console.log("Unexpected error during logout", error);
        res.redirect("/error");
    }
};

module.exports = {
    loadLogin,
    handleLogin,
    logout,
    pageError
}