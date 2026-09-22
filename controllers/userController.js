const User = require("../models/User");
const Job = require("../models/Job");
const normalizeSkill = require("../utils/normalizeSkill");
const {
  getVisibleJobQuery
} = require("../utils/jobLifecycle");

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeInboxEmail = (email) => {
  const inboxEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (
    inboxEmail &&
    !emailPattern.test(inboxEmail)
  ) {
    throw new Error(
      "Invalid inbox email"
    );
  }

  return inboxEmail;
};

// Create user profile
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobileNumber,
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
      mobileNumber:
        String(mobileNumber || "").trim(),
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
    const user =
      await User.findById(
        req.user.id
      ).select("-password");

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
    const existingUser =
      await User.findById(req.user.id)
        .select(
          "inboxEmail gmailConnected gmailConnectedAt"
        );

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (updates.skills) {
      updates.skills = updates.skills.map(normalizeSkill);
    }

    delete updates.gmailConnected;
    delete updates.gmailConnectedAt;

    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "inboxEmail"
      )
    ) {
      updates.inboxEmail =
        normalizeInboxEmail(
          updates.inboxEmail
        );

      const currentInboxEmail =
        normalizeInboxEmail(
          existingUser.inboxEmail
        );

      if (
        updates.inboxEmail !==
        currentInboxEmail
      ) {
        updates.gmailConnected = false;
        updates.gmailConnectedAt = null;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
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

    res.status(
      error.message ===
        "Invalid inbox email"
        ? 400
        : 500
    ).json({
      message:
        error.message ===
          "Invalid inbox email"
          ? error.message
          : "Failed to update user"
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
    const { jobId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const job = await Job.findOne({
      _id: jobId,
      ...getVisibleJobQuery()
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found or no longer active"
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
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: "savedJobs",
        match: getVisibleJobQuery()
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      total:
        user.savedJobs.filter(Boolean).length,
      savedJobs:
        user.savedJobs.filter(Boolean)
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
    const { jobId } = req.params;
    const userId = req.user.id;

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
