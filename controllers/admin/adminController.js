const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const loadLogin = (req, res) => {
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login", { message: null });
}

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
        res.redirect("/admin/");
        
    } catch (error) {
        console.error("Login error:", error);
        res.render("admin-login", { errorMessage: "An error occurred during login" });
    }
}

const loadDashbaord = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("dashboard");
        } catch (error) {
            console.error(" not load dashboard ", error);
            res.redirect('/error');
        }
    } else {
        res.redirect('/admin/login');
    }
};


const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect("/error")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        coonsoole.log("unexpexted error during logout",error);
        res.redirect("/error")
    }
}

module.exports = {
    loadLogin,
    handleLogin,
    loadDashbaord,
    logout
}