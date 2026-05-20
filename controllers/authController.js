const User = require("../models/User");
const bcrypt = require("bcryptjs");
const normalizeSkill = require("../utils/normalizeSkill");
const jwt=require("jsonwebtoken");

exports.register = async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      skills,   
      preferredLocation,
      preferredJobType
    } = req.body;

    const existingUser =
      await User.findOne({
        email
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User already exists"
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const normalizedSkills =
      (skills || []).map(
        normalizeSkill
      );

    const user =
      await User.create({

        name,

        email,

        password:
          hashedPassword,

        skills:
          normalizedSkills,

        preferredLocation,

        preferredJobType
      });

    res.status(201).json({

      message:
        "User registered successfully",

      user: {
        id:
          user._id,

        name:
          user.name,

        email:
          user.email
      }

    });

  } catch (error) {

    console.error(
      "Register error:",
      error
    );

    res.status(500).json({
      message:
        "Registration failed"
    });

  }
};

exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token =
      jwt.sign(
        {
          id: user._id
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      message:
        "Login failed"
    });

  }
};