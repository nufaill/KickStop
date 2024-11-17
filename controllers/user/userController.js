const User = require("../../models/userSchema")

const pageNotFound = async (req, res) => {
    try {
        return res.status(404).render("error", {
            errorCode: 404,
            message: "Page Not Found"
        });
    } catch (error) {
        console.log(error);
        res.status(500).redirect("/error");
    }
};

const loadHomepage = async (req,res) => {
    try {
        return res.render("home");
    } catch (error) {
        console.log("Home page not found",error);
        res.status(500).send("Server error");
  
    }
};
const loadLogin = async (req,res) => {
    try {
        return res.render("login");
    } catch (error) {
        console.log("login page not found",error);
        res.status(500).send("Server error");

    }
};
const loadsignup = async (req,res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("login page not found",error);
        res.status(500).send("Server error");   

    }
};

const signup = async (req,res) => {
    const {fullname,email,password} = req.body;
    try {
        console.log(req.body)
        const newUser = new User({username:fullname,email,password});
        console.log(newUser)

        await newUser.save();

        return res.redirect("/signup")
    } catch (error) {
        console.error("Error for save user",error);
        res.status(500).send("Internal server error");
    }
}

module.exports={
    loadHomepage,
    loadLogin,
    pageNotFound,
    loadsignup,
    signup
}