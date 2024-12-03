const User = require("../../models/userSchema");
const Product = require('../../models/productSchema')
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")

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

const loadHomepage = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const products = await Product.find({isBlocked: false});
        
        if (userId) {
            const userData = await User.findById(userId);
            if (userData) {
                return res.render("home", { 
                    user: {
                        _id: userData._id,
                        username: userData.username,
                        email: userData.email
                    },
                    products
                });
            }
        }
        res.render("home", { user: null, products });
    } catch (error) {
        console.error("Home page error:", error);
        res.status(500).send("Server error");
    }
};

const loadLogin = async (req,res) => {
    try {
        if(!req.session.user){
            return res.render("login", { errorMessage: null })
        }else{
            res.redirect("/")
        }
    } catch (error) {
        console.log("login page not found",error);
        res.status(500).send("Server error");
    }
};

const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        const findUser = await User.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render("login",{errorMessage:"Email or Password is incorrect"});
        }
        if(findUser.isBlocked){
            return res.render("login",{errorMessage:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{errorMessage:"Email or Password is incorrect"})
        }

        // Store necessary user data in session
        req.session.user = {
            _id: findUser._id,
            username: findUser.username,
            email: findUser.email
        };
        
        res.redirect("/")

    } catch (error) {
       console.error("login error",error);
       res.render("login",{errorMessage:"login failed. please try again later"})
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("Error logging out");
            }
            res.redirect('/');
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).send("Server error");
    }
};

const loadsignup = async (req,res) => {
    try {
        return res.render("signup", { message: null });
    } catch (error) {
        console.log("signup page not found",error);
        res.status(500).send("Server error");   
    }
};

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendverificationEmail(email,otp) {
   try {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service :'gmail',
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        },
        tls: {
            rejectUnauthorized: false, 
        },
    })

    const info = await transporter.sendMail({
        from:`"KickStop"<${process.env.NODEMAILER_EMAIL}>`,
        to:email,
        subject:"Verify Your Kickstop Account",
        text:`Your OTP is ${otp}`,
        html: `
                <html>
                <body>
                    <h2>Welcome to Kickstop!</h2>
                    <p>Hi there,</p>
                    <p>Your OTP for verification is: <strong>${otp}</strong></p>
                    <p>If you did not request this, please ignore this email.</p>
                    <br>
                    <p>Thanks,</p>
                    <p>The Kickstop Team</p>
                </body>
                </html>
            `,
    })

    return info.accepted.length > 0

   } catch (error) {
    console.error("Error sending email",error);
    return false;
   }
}

const signup = async (req,res) => {
    try {
        const {fullname,email,password,cpassword} = req.body;
       if(password !== cpassword){
        return res.render("signup",{message:"Passwords do not match"});
       }
       const findUser = await User.findOne({email});
       if(findUser){
        return res.render("signup",{message:"User with this email already exists"})
       }
       const otp = generateOtp();

       const emailSent = await sendverificationEmail(email,otp);
       if(!emailSent){
        return res.json("email-error")
       }

       req.session.userOtp = otp;
       req.session.userData = {fullname,email,password};

       res.render("verify-otp");
       console.log("OTP sent",otp);

    } catch (error) {
        console.error("signup error",error);
        res.status(500).send("Internal server error");
    }
}

const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
}

const verifyOtp = async (req,res) => {
    try {
        const {otp} = req.body;
        console.log(otp)

        if(otp === req.session.userOtp){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                username: user.fullname,
                email: user.email,
                password: passwordHash
            });

            await saveUserData.save();
            
            req.session.user = {
                _id: saveUserData._id,
                username: saveUserData.username,
                email: saveUserData.email
            };
            
            res.json({success: true, redirectUrl: "/"})
        } else {
            res.status(400).json({success: false, message: "Invalid OTP, Please try again"})
        }
    } catch (error) {
        console.error("Error Verifying OTP",error);
        res.status(500).json({success: false, message: "An error occurred"})
    }
}

const resendOtp = async (req,res) => {
   try {
    if (!req.session.userData || !req.session.userData.email) {
        return res.status(400).json({ success: false, message: "Email not found in session" });
    }
    
    const { email } = req.session.userData;
    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendverificationEmail(email,otp);
    if(emailSent){
        console.log("Resend OTP:",otp);
        res.status(200).json({success: true, message: "OTP Resent Successfully"});
    }else{
        res.status(500).json({success: false, message: "Failed to resend OTP. Please try again"});
    }

   } catch (error) {
    console.error("Error Resending OTP",error);
    res.status(500).json({success: false, message: "Internal Server Error. Please try again"})
   }
}

module.exports = {
    loadHomepage,
    loadLogin,
    login,
    logout,
    pageNotFound,
    loadsignup,
    signup,
    verifyOtp,
    resendOtp
}