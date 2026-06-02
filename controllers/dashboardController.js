const Application = require("../models/Application");
const EmailJob = require("../models/EmailJob");
const Job = require("../models/Job");


exports.getDashboardSummary = async (
  req,
  res
) => {

  try {

    const userId =
      "6a0c6446f0dc236879aa07d7";

    const [
      applied,
      interviews,
      accepted,
      rejected,
      trusted,
      review,
      filtered,
      marketJobs
    ] = await Promise.all([

      Application.countDocuments({
        user: userId,
        status: "APPLIED"
      }),

      Application.countDocuments({
        user: userId,
        status: "INTERVIEW"
      }),

      Application.countDocuments({
        user: userId,
        status: "ACCEPTED"
      }),

      Application.countDocuments({
        user: userId,
        status: "REJECTED"
      }),

      EmailJob.countDocuments({
        user: userId,
        trust: "🟢 Trusted"
      }),

      EmailJob.countDocuments({
        user: userId,
        trust: "🟡 Needs Review"
      }),

      EmailJob.countDocuments({
        user: userId,
        trust: "🔴 Filtered"
      }),

      Job.countDocuments()

    ]);

    const recentActivity =
  await Application
    .find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select(
      "company role status updatedAt"
    );

    res.json({
      success: true,

      applications: {
        applied,
        interviews,
        accepted,
        rejected
      },

      inbox: {
        trusted,
        review,
        filtered
      },

      marketJobs,
      recentActivity
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};