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
const goalModel = require("./models/goals");
const transactionModel = require("./models/transcations");

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

    const encodedToken = encodeURIComponent(token).replace(/\./g, "%2E");
    const resetPasswordLink = `http://localhost:3000/reset_password/${encodedToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "investwise884@gmail.com",
        pass: "xqfadrmaqhcylfsj",
      },
    });

    const mailOptions = {
      from: "investwise884@gmail.com",
      to: email,
      subject: "Reset Password",
      html: `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333; margin-top: 10px; margin-bottom: 5px;">Invest Wise</h1>
        <h4 style="font-size: 16px; color: #666; margin: 0;">Personal Finance and Investment Education Platform</h4>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Forgot Password</h2>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear User,</p>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">You have requested to reset your password for your Invest Wise account. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${resetPasswordLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-size: 18px;">Reset Password</a>
        </div>
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">If you did not request this, please ignore this email.</p>
      </div>
      <p style="text-align: center; font-size: 14px; color: #666; margin-top: 20px;">Thanks,</p>
      <p style="text-align: center; font-size: 14px; color: #666; margin-bottom: 0;">InvestWise Team</p>
    </div>
  `,
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
        user: "investwise884@gmail.com",
        pass: "xqfadrmaqhcylfsj",
      },
    });

    const mailOptions = {
      from: email,
      to: "investwise884@gmail.com",
      subject: "New Contact Form Submission",
      html: `
    <div>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <p>Message: ${message}</p>
    </div>
  `,
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

    await goalModel.deleteMany({ email });

    await transactionModel.deleteMany({ email });

    return res.json({ status: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================ADD NEW GOAL==============================*/

app.post("/goals", async (req, res) => {
  try {
    const { title, description, targetDate, email } = req.body;

    const newGoal = new goalModel({
      email,
      title,
      description,
      targetDate,
    });

    await newGoal.save();

    return res.status(201).json(newGoal);
  } catch (error) {
    console.error("Error adding new goal:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*=============================GET GOALS ROUTING==============================*/

app.get("/goals", async (req, res) => {
  try {
    const { email } = req.query;

    const userGoals = await goalModel.find({ email });

    return res.json(userGoals);
  } catch (error) {
    console.error("Error fetching user goals:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================UPDATE GOAL ROUTING==============================*/

app.put("/goals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, targetDate } = req.body;

    const updatedGoal = await goalModel.findByIdAndUpdate(
      id,
      { title, description, targetDate },
      { new: true }
    );

    if (!updatedGoal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    return res.json(updatedGoal);
  } catch (error) {
    console.error("Error updating goal:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================DELETE GOAL ROUTING==============================*/

app.delete("/goals/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await goalModel.findById(id);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await goalModel.findByIdAndDelete(id);

    return res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

/*=============================GET TRANSCATIONS ROUTING==============================*/

app.get("/transactions", async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const transactions = await transactionModel.find({ email });
      res.json(transactions);
    }
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).send("Internal Server Error");
  }
});

/*=============================POST TRANSCATIONS ROUTING==============================*/

app.post("/transactions", async (req, res) => {
  const { type, amount, transactionType, email } = req.body;
  try {
    const newTransaction = new transactionModel({
      type,
      amount,
      transactionType,
      email,
    });
    await newTransaction.save();
    res.json(newTransaction);
  } catch (err) {
    console.error("Error adding transaction:", err);
    res.status(500).send("Internal Server Error");
  }
});

/*=============================DELETE TRANSACTIONS ROUTING==============================*/

app.delete("/transactions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTransaction = await transactionModel.findByIdAndDelete(id);
    if (!deletedTransaction) {
      return res.status(404).send("Transaction not found");
    }
    res.json(deletedTransaction);
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).send("Internal Server Error");
  }
});
/*=============================APP LISTEN==============================*/

app.listen(process.env.PORT, () => {
  console.log("Server is running");
});
