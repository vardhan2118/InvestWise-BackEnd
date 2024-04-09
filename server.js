/*=============================REQUIRED MODULES==============================*/

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
const userModel = require("./models/users");
const profileModel = require("./models/profiles");

/*=============================MIDDLEWARES==============================*/

app.use(cookieParser());
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

/*=============================MONGODB CONNECTION==============================*/

const mongodbURI = process.env.MONGODB_URI;

const connectToDatabase = async () => {
  try {
    await mongoose.connect(mongodbURI);
    console.log("Database connection Successful");
  } catch (error) {
    console.error("Error in connecting ", error.stack);
  }
};

connectToDatabase();

/*=================================ROUTING==================================*/

/*=============================SIGNUP ROUTING==============================*/

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "Email Already Registered" });
    } else {
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = new userModel({
        username,
        email,
        password: hashPassword,
      });
      await newUser.save();
      return res.json({ status: true, message: "Record registered" });
    }
  } catch (error) {
    console.log("Error in signing up:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================LOGIN ROUTING==============================*/

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ status: false, message: "No record found" });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.json({ status: false, message: "Password is incorrect" });
    }
    const token = jwt.sign({ username: user.username }, process.env.KEY, {
      expiresIn: "1hr",
    });
    res.cookie("token", token, { httpOnly: true, maxAge: 360000 });
    const profile = await profileModel.findOne({ email });

    let responseData = {
      status: true,
      message: "Login successful",
      username: user.username,
      email: user.email,
    };

    if (profile && profile.mobileNumber) {
      responseData.mobileNumber = profile.mobileNumber;
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*=============================FORGOT PASSWORD ROUTING==============================*/

app.post("/forgot_password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ message: "User not registered" });
    }
    const token = jwt.sign({ id: user._id }, process.env.KEY, {
      expiresIn: "5m",
    });

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "cchitravardhan21@gmail.com",
        pass: "sunvieenmlmsfnww",
      },
    });
    const encodedToken = encodeURIComponent(token).replace(/\./g, "%2E");
    var mailOptions = {
      from: "cchitravardhan21@gmail.com",
      to: email,
      subject: "Reset Password",
      text: `http://localhost:3000/reset_password/${encodedToken}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending email" });
      } else {
        return res.json({ status: true, message: "Email sent" });
      }
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*=============================RESET PASSWORD ROUTING==============================*/

app.post("/reset_password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.KEY);
    const id = decoded.id;
    const hashPassword = await bcrypt.hash(password, 10);
    await userModel.findByIdAndUpdate({ _id: id }, { password: hashPassword });
    return res.json({ status: true, message: "updated password" });
  } catch (err) {
    return res.json("invalid token");
  }
});

/*=============================CONTACT ROUTING==============================*/

app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "cchitravardhan21@gmail.com",
        pass: "sunvieenmlmsfnww",
      },
    });

    const mailOptions = {
      from: email,
      to: "cchitravardhan21@gmail.com",
      subject: "New Contact Form Submission",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending email" });
      } else {
        return res.json({ status: true, message: "Email sent" });
      }
    });
  } catch (error) {
    console.error("Error in contact form submission:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*=============================LOGOUT ROUTING==============================*/

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ status: true });
});

/*=============================PROFILE POST ROUTING==============================*/

app.post("/profile", async (req, res) => {
  try {
    const {
      photo,
      firstName,
      lastName,
      username,
      email,
      mobileNumber,
      dateOfBirth,
      annualIncome,
      occupation,
      address,
      state,
      zip,
      gender,
      bio,
    } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = new profileModel({
      photo,
      firstName,
      lastName,
      username,
      email,
      mobileNumber,
      dateOfBirth,
      annualIncome,
      occupation,
      address,
      state,
      zip,
      gender,
      bio,
    });

    await profile.save();

    return res.status(201).json({ message: "Profile created successfully" });
  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================PROFILE GET ROUTING==============================*/

app.get("/profile", async (req, res) => {
  try {
    const { email } = req.query;
    const profile = await profileModel.findOne({ email });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const formattedProfile = {
      ...profile._doc,
      dateOfBirth: profile.dateOfBirth.toISOString().split("T")[0],
    };

    return res.json(formattedProfile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================PROFILE PUT ROUTING==============================*/

app.put("/profile", async (req, res) => {
  try {
    const {
      photo,
      firstName,
      lastName,
      username,
      email,
      mobileNumber,
      dateOfBirth,
      annualIncome,
      occupation,
      address,
      state,
      zip,
      gender,
      bio,
    } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await profileModel.findOneAndUpdate(
      { email },
      {
        $set: {
          photo,
          firstName,
          lastName,
          username,
          mobileNumber,
          dateOfBirth,
          annualIncome,
          occupation,
          address,
          state,
          zip,
          gender,
          bio,
        },
      },
      { new: true }
    );

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================DELETE ACCOUNT ROUTING==============================*/

app.delete("/delete_account", async (req, res) => {
  try {
    const { email } = req.body;

    await userModel.findOneAndDelete({ email });

    await profileModel.findOneAndDelete({ email });

    return res.json({ status: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================APP LISTEN==============================*/

app.listen(process.env.PORT, () => {
  console.log("Server is running");
});
