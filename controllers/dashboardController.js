const Application = require("../models/Application");
const EmailJob = require("../models/EmailJob");
const Job = require("../models/Job");
const User = require("../models/User");
const {
  getVisibleJobQuery
} = require("../utils/jobLifecycle");

const rate = (value, total) => {
  if (!total) return 0;
  return Math.round(
    (value / total) * 100
  );
};

const normalizeSource = (source = "") => {
  const value =
    String(source).toLowerCase();

  if (value === "jsearch") return "JSearch";
  if (value === "adzuna") return "Adzuna";
  if (value === "collector") return "Collector";

  return source || "Manual";
};

exports.getDashboardSummary = async (
  req,
  res
) => {

  try {

    const userId =
      req.user.id;

    const [
      applied,
      interviews,
      accepted,
      rejected,
      trusted,
      review,
      filtered,
      marketJobs,
      user,
      jobs,
      emailJobs
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

      Job.countDocuments(
        getVisibleJobQuery()
      )

      ,

      User.findById(userId)
        .select(
          "inboxEmail gmailConnected gmailConnectedAt"
        ),

      Job.find(
        getVisibleJobQuery()
      )
        .select(
          "source location applyLink experienceLevel"
        )
        .lean(),

      EmailJob.find({
        user: userId
      })
        .select(
          "trust priority opportunityScore"
        )
        .lean()

    ]);

    const totalApplications =
      applied + interviews + accepted + rejected;

    const recentActivity =
  await Application
    .find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select(
      "company role status updatedAt"
      );

    const sourceCounts = {};

    jobs.forEach((job) => {
      const source =
        normalizeSource(job.source);

      sourceCounts[source] =
        (sourceCounts[source] || 0) + 1;
    });

    const sourceMix =
      Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source,
          count
        }))
        .sort((a, b) => b.count - a.count);

    const locationCounts = {};

    jobs.forEach((job) => {
      const location =
        job.location || "Unknown";

      locationCounts[location] =
        (locationCounts[location] || 0) + 1;
    });

    const topLocation =
      Object.entries(locationCounts)
        .map(([location, count]) => ({
          location,
          count
        }))
        .sort((a, b) => b.count - a.count)[0] ||
      {
        location: "No jobs yet",
        count: 0
      };

    const experienceCounts = {};

    jobs.forEach((job) => {
      const level =
        job.experienceLevel ||
        "Not Specified";

      experienceCounts[level] =
        (experienceCounts[level] || 0) + 1;
    });

    const experienceMix =
      Object.entries(experienceCounts)
        .map(([level, count]) => ({
          level,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

    const jobsWithApplyLink =
      jobs.filter(job =>
        Boolean(job.applyLink)
      ).length;

    const highPriority =
      emailJobs.filter(job =>
        String(job.priority).toUpperCase() === "HIGH"
      ).length;

    const avgOpportunityScore =
      emailJobs.length
        ? Math.round(
            emailJobs.reduce(
              (sum, job) =>
                sum + (job.opportunityScore || 0),
              0
            ) / emailJobs.length
          )
        : 0;

    const recommendedAction =
      trusted > 0
        ? `Review ${trusted} trusted inbox opportunities`
        : topLocation.count > 0
          ? `Explore ${topLocation.count} jobs in ${topLocation.location}`
          : "Connect Gmail and sync jobs to unlock insights";

    res.json({
      success: true,

      applications: {
        applied,
        interviews,
        accepted,
        rejected
      },

      analytics: {
        applicationRate:
          rate(applied, totalApplications),
        interviewRate:
          rate(interviews, totalApplications),
        offerRate:
          rate(accepted, totalApplications),
        rejectionRate:
          rate(rejected, totalApplications)
      },

      inbox: {
        trusted,
        review,
        filtered,
        highPriority,
        avgOpportunityScore,
        inboxEmail:
          user?.inboxEmail || "",
        gmailConnected:
          Boolean(user?.gmailConnected),
        gmailConnectedAt:
          user?.gmailConnectedAt || null
      },

      market: {
        sourceMix,
        topLocation,
        experienceMix,
        applyLinkCoverage: {
          withLinks: jobsWithApplyLink,
          total: jobs.length,
          percentage:
            rate(jobsWithApplyLink, jobs.length)
        }
      },

      recommendedAction,

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
