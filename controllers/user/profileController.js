const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      tls: {
        rejectUnauthorized: false,
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
            <p>Your OTP for  reset: <strong>${otp}</strong></p>
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

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {

  }
}

const getForgetPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    console.error("Error rendering forgot password page:", error.message);
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, message: "Invalid email format" });
    }

    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);
  
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = hashedOtp;
        req.session.email = email;
        req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

        res.render("forgotpass-otp");
      console.log("OTP sent:", otp);
      } else {
        res.json({ success: false, message: "Failed to send OTP. Please try again" });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist"
      });
    }
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;

    // Check if session data exists
    if (!req.session.userOtp || !req.session.email) {
      return res.render('forgotpass-otp', {
        message: 'Session expired. Please start over.'
      });
    }
    if (Date.now() > req.session.otpExpiration) {
      return res.render('forgotpass-otp', {
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    const isOtpValid = await bcrypt.compare(enteredOtp, req.session.userOtp);
    
    if (isOtpValid) {
      req.session.otpVerified = true;
      res.redirect('/reset-password');
    } else {
      res.render('forgotpass-otp', {
        message: 'Invalid OTP. Please try again.'
      });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.render('forgotpass-otp', {
      message: 'An error occurred. Please try again.'
    });
  }
};

const getResetPassPage = async (req, res) => {
  try {

      const message = req.query.msg || ""
      res.render('reset-password', message);

  } catch (error) {
      res.redirect('/page-not-found');
  }
}

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
const resendForgotOtp = async (req, res) => {
  try {
    const email = req.session.email;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'No email found in session' });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      req.session.userOtp = hashedOtp;
      req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

      console.log("Resent OTP:", otp);
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
};


const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    
    const email = req.session.email;

    if (!req.session.otpVerified) {
      return res.render("change-password", {
        message: "Please verify your email first"
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    console.log('Password validation:', {
      password: newPass1,
      meetsRegex: passwordRegex.test(newPass1)
    });

    if (!passwordRegex.test(newPass1)) {
      return res.render("reset-password", {
        message: "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
      });
    }

    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );

      // Clear sensitive session data
      delete req.session.userOtp;
      delete req.session.otpVerified;
      delete req.session.email;

      res.redirect("/login");
    } else {
      res.render("reset-password", {
        message: "Passwords do not match"
      });
    }
  } catch (error) {
    console.error("Error in postNewPassword:", error);
    res.render("reset-password", {
      message: "An error occurred. Please try again."
    });
  }
}

const userprofile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const userAddress = await Address.find({ userId: userId });
    res.render('profile', {
      user: userData,
      userAddress: userAddress
    });
  } catch (error) {
    console.error("Error retrieving profile data:", error);
    res.redirect("/pageNotFound");
  }
}

const changeEmail = async (req, res) => {
  try {
    res.render("change-email", { message: null });
  } catch (error) {
    console.error("Error in changeEmail:", error);
    res.redirect('/error');
  }
};
const changeEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.session.user;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.render("change-email", {
        message: "User not found. Please login again."
      });
    }

    if (email !== currentUser.email) {
      return res.render("change-email", {
        message: "Entered email does not match your current email"
      });
    }
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      // Store data in session
      req.session.currentEmail = email;
      req.session.emailChangeOtp = hashedOtp;
      req.session.emailOtpExpiration = Date.now() + 5 * 60 * 1000;

      console.log("Email change OTP sent:", otp);
      res.render("change-email-otp", { message: "" });
    } else {
      res.render("change-email", {
        message: "Failed to send verification email. Please try again."
      });
    }
  } catch (error) {
    console.error("Error in changeEmailValid:", error);
    res.render("change-email", {
      message: "An error occurred. Please try again."
    });
  }
};

const verifyEmailChangeOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.emailChangeOtp || !req.session.currentEmail) {
      return res.render("change-email-otp", {
        message: "Session expired. Please try again."
      });
    }

    if (Date.now() > req.session.emailOtpExpiration) {
      return res.render("change-email-otp", {
        message: "OTP has expired. Please request a new one."
      });
    }

    const isOtpValid = await bcrypt.compare(otp, req.session.emailChangeOtp);
    if (!isOtpValid) {
      return res.render("change-email-otp", {
        message: "Invalid OTP. Please try again."
      });
    }
    res.render("new-email", { message: "" });

  } catch (error) {
    console.error("Error in verifyEmailChangeOtp:", error);
    res.render("change-email-otp", {
      message: "An error occurred. Please try again."
    });
  }
};


const updateEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.user;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.render("new-email", {
        message: "Invalid email format"
      });
    }

    if (newEmail === req.session.currentEmail) {
      return res.render("new-email", {
        message: "New email cannot be same as current email"
      });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.render("new-email", {
        message: "Email already registered with another account"
      });
    }

    await User.findByIdAndUpdate(userId, { email: newEmail });

    // Clear email change session data
    delete req.session.emailChangeOtp;
    delete req.session.currentEmail;
    delete req.session.emailOtpExpiration;

    res.redirect("/profile?message=Email updated successfully");

  } catch (error) {
    console.error("Error in updateEmail:", error);
    res.render("new-email", {
      message: "An error occurred. Please try again."
    });
  }
};

const changePassword = async (req, res) => {
  try {
    res.render('change-password', { message: null });
  } catch (error) {
    console.log('change-password page not found', error);
    res.redirect('/pageerror');
  }
};


const changePasswordValid = async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('change-password', {
        message: 'Please enter a valid email address'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);

      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = hashedOtp;
        req.session.email = email;
        req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

        console.log('OTP for testing:', otp);
        res.render('change-password-otp', { message: null });
      } else {
        res.render('change-password', {
          message: 'Failed to send OTP. Please try again'
        });
      }
    } else {
      res.render('change-password', {
        message: 'User with this email does not exist'
      });
    }
  } catch (error) {
    console.log('Error in change password validation', error);
    res.render('change-password', {
      message: 'An error occurred. Please try again'
    });
  }
};


const verifyChangepasswordOtp = async (req, res) => {
  try {
    
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.otpExpiration) {
      return res.render('change-password', {
        message: 'Session expired. Please try again'
      });
    }

    if (Date.now() > req.session.otpExpiration) {
      return res.render('change-password-otp', {
        message: 'OTP has expired. Please request a new one'
      });
    }

    const isOtpValid = await bcrypt.compare(otp, req.session.userOtp);
    
    if (isOtpValid) {
      req.session.otpVerified = true;
      res.render('reset-password', { message: null });
    } else {
      res.render('change-password-otp', {
        message: 'Invalid OTP. Please try again'
      });
    }
  } catch (error) {
    console.error('Error in verifyChangepasswordOtp:', error);
    res.render('change-password-otp', {
      message: 'An error occurred. Please try again'
    });
  }
};

const verifyOtpMiddleware = (req, res, next) => {
  if (req.session.otpVerified) {
    next();
  } else {
    res.redirect("/change-password");
  }
};

const addAddress = async (req, res) => {
  try {
    const user = req.session.user;
    res.render("add-address", { user: user })
  } catch (error) {
    res.redirect('/pageerror')
  }
}

const postAddaddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressType, name, city, landmark, state, pincode, phone, altphone, address, email } = req.body;

    const newAddress = new Address({
      userId,
      addressType,
      name,
      city,
      landmark,
      state,
      pincode,
      phone,
      altphone,
      address,
      email
    });
    await newAddress.save();
    res.redirect('/profile');
  } catch (error) {
    console.error('Error adding address', error)
  }
}
const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user;

    const address = await Address.findOne({ 
      userId: userId, 
      _id: addressId 
    });

    if (!address) {
      return res.status(404).render('error', {
        message: 'Address not found',
        errorCode: 404
      });
    }

    res.render("edit-address", { address: address, user: userId });

  } catch (error) {
    console.error("Error in edit address", error);
    res.status(500).render('error', {
      message: 'Internal server error',
      errorCode: 500
    });
  }
}

const updateAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user;
    const { addressType, name, city, landmark, state, pincode, phone, altphone, address, email } = req.body;

    // Validation checks
    const validationErrors = [];
    if (!name) validationErrors.push('Name is required');
    if (!city) validationErrors.push('City is required');
    if (!state) validationErrors.push('State is required');
    if (!pincode || !/^\d{6}$/.test(pincode)) validationErrors.push('Valid Pincode is required');
    if (!phone || !/^\d{10}$/.test(phone)) validationErrors.push('Valid Phone number is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors.push('Valid Email is required');

    if (validationErrors.length > 0) {
      return res.status(400).render('edit-address', {
        message: validationErrors.join(', '),
        address: req.body
      });
    }

    const updatedAddress = await Address.findOneAndUpdate(
      { 
        userId: userId, 
        _id: addressId 
      },
      {
        addressType: addressType || 'home',
        name,
        city,
        landmark: landmark || '',
        state,
        pincode,
        phone,
        altphone: altphone || '',
        address,
        email
      },
      {
        new: true,  
        runValidators: true
      }
    );

    if (!updatedAddress) {
      return res.status(404).render('error', {
        message: 'Address not found or could not be updated',
        errorCode: 404
      });
    }

    res.redirect('/profile?message=Address updated successfully');
  } catch (error) {
    console.error("Detailed error updating address:", error);
    res.status(500).render('error', {
      message: 'Internal server error',
      errorCode: 500,
      details: error.message
    });
  }
}

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.user;

    const result = await Address.findOneAndDelete({ 
      userId: userId, 
      _id: addressId 
    });

    if (!result) {
      return res.status(404).render('error', {
        message: 'Address not found',
        errorCode: 404
      });
    }

    res.redirect('/profile?message=Address deleted successfully');
  } catch (error) {
    console.error("Error deleting address", error);
    res.status(500).render('error', {
      message: 'Internal server error',
      errorCode: 500
    });
  }
}
module.exports = {
  getForgetPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  verifyOtp,
  postNewPassword,
  userprofile,
  changeEmail,
  changeEmailValid,
  verifyEmailChangeOtp,
  updateEmail,
  changePassword,
  changePasswordValid,
  verifyChangepasswordOtp,
  verifyOtpMiddleware,
  addAddress,
  postAddaddress,
  editAddress,
  deleteAddress,
  updateAddress,
  resendForgotOtp
};