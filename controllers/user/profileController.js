const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"KickStop" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Reset Password for Your Kickstop Account",
      html: `
        <html>
          <body>
            <h2>Welcome to Kickstop!</h2>
            <p>Hi there,</p>
            <p>Your OTP for Password reset: <strong>${otp}</strong></p>
            <p>If you did not request this, please ignore this email.</p>
            <br>
            <p>Thanks,</p>
            <p>The Kickstop Team</p>
          </body>
        </html>
      `,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return false;
  }
};

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}

// Render forgot-password page
const getForgetPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    console.error("Error rendering forgot password page:", error.message);
  }
};

// Validate email and send OTP
const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, message: "Invalid email format" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);

      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = hashedOtp;
        req.session.email = email;
        req.session.otpExpiration = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

        res.render("forgotpass-otp");
        console.log("OTP sent:", otp);
      } else {
        res.json({ success: false, message: "Failed to send OTP. Please try again" });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist",
      });
    }
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
  }
};

// Verify the OTP
const verifyForgotPassOtp = async (req, res) => {
    try {
      const { otp } = req.body;
  
      // Check if OTP has expired
      if (Date.now() > req.session.otpExpiration) {
        return res.json({ success: false, message: "OTP has expired. Please request a new one." });
      }
  
      // Compare entered OTP with hashed OTP
      const isOtpValid = await bcrypt.compare(otp, req.session.userOtp);
      if (isOtpValid) {
        res.redirect("/reset-password");
      } else {
        res.json({ success: false, message: "OTP does not match." });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error.message);
      res.status(500).json({ success: false, message: "Internal server error. Please try again." });
    }
  };
  

// Render reset-password page
const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    console.error("Error rendering reset password page:", error.message);
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
    try {
      if (!req.session.email) {
        return res.status(400).json({ success: false, message: "Email not found in session" });
      }
  
      const email = req.session.email;
      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);
  
      // Update session with new OTP and expiration time
      req.session.userOtp = hashedOtp;
      req.session.otpExpiration = Date.now() + 5 * 60 * 1000; // Reset OTP expiration
  
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        console.log("Resend OTP:", otp);
        res.status(200).json({ success: true, message: "OTP resent successfully." });
      } else {
        res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
      }
    } catch (error) {
      console.error("Error resending OTP:", error.message);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
  

// Verify OTP for reset password API
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const postNewPassword   = async(req,res)=>{
    try {
        const {newPass1, newPass2} = req.body;
        const email = req.session.email;
        if(newPass1===newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render('reset-password',{message:'Password do not match'});
        }
    } catch (error) {
        res.redirect('/error')
    }
}

module.exports = {
  getForgetPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  verifyOtp,
  postNewPassword
};
