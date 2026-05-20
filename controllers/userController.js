const User = require("../models/User");
const Job = require("../models/Job");
const normalizeSkill = require("../utils/normalizeSkill");

// Create user profile
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      skills,
      preferredLocation,
      preferredJobType
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const normalizedSkills = (skills || []).map(normalizeSkill);

    const user = await User.create({
      name,
      email,
      password,
      skills: normalizedSkills,
      preferredLocation,
      preferredJobType
    });

    res.status(201).json(user);

  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      message: "Failed to create user"
    });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);

  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
};

// Get one user
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(user);

  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      message: "Failed to fetch user"
    });
  }
};

// Update user profile
exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.skills) {
      updates.skills = updates.skills.map(normalizeSkill);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(user);

  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      message: "Failed to update user"
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      message: "Failed to delete user"
    });
  }
};

// Save a job
exports.saveJob = async (req, res) => {
  try {
    const { userId, jobId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    // Fix old users that don't have savedJobs
    if (!user.savedJobs) {
      user.savedJobs = [];
    }

    // Prevent duplicate saves safely
    const alreadySaved = user.savedJobs.some(
      savedJob => savedJob.toString() === jobId
    );

    if (alreadySaved) {
      return res.status(400).json({
        message: "Job already saved"
      });
    }

    user.savedJobs.push(jobId);

    await user.save();

    res.json({
      message: "Job saved successfully",
      savedJobs: user.savedJobs
    });

  } catch (error) {

    console.error("Save job error:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

// Get saved jobs
exports.getSavedJobs = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate("savedJobs");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      total: user.savedJobs.length,
      savedJobs: user.savedJobs
    });

  } catch (error) {
    console.error("Get saved jobs error:", error);

    res.status(500).json({
      message: "Failed to fetch saved jobs"
    });
  }
};

// Remove saved job
exports.removeSavedJob = async (req, res) => {
  try {
    const { userId, jobId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.savedJobs = user.savedJobs.filter(
      savedJobId => savedJobId.toString() !== jobId
    );

    await user.save();

    res.json({
      message: "Saved job removed successfully",
      savedJobs: user.savedJobs
    });

  } catch (error) {
    console.error("Remove saved job error:", error);

    res.status(500).json({
      message: "Failed to remove saved job"
    });
  }
};