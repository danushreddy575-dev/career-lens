const express = require("express");

const router = express.Router();
const auth =require("../middleware/authMiddleware");
const Job = require("../models/Job");
const User = require("../models/User");
const EmailJob = require("../models/EmailJob");
const Application = require("../models/Application");
const extractSkills = require("../utils/skillExtractor");
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

  if (value === "jsearch") {
    return "JSearch";
  }

  if (value === "adzuna") {
    return "Adzuna";
  }

  if (value === "collector") {
    return "Collector";
  }

  return source || "Manual";
};

router.get("/",auth,async (req, res) => {

  try {
    const userId =
    req.user.id;


    const visibleJobQuery =
      getVisibleJobQuery();

    const totalJobs =
      await Job.countDocuments(
        visibleJobQuery
      );


    const [
      applications,
      emailJobs,
      user
    ] = await Promise.all([
      Application.find({
        user: userId
      }),
      EmailJob.find({
        user: userId
      }),
      User.findById(userId)
    ]);

    const jobs =
      await Job.find(
        visibleJobQuery
      );

    const skills = {};

    const countSkill = (skill) => {
      skills[skill] =
        (skills[skill] || 0)
        + 1;
    };

    jobs.forEach((job) => {

      (job.skills || [])
      .forEach((skill) => {

        countSkill(skill);

      });

      extractSkills(
        `${job.title} ${job.description || ""}`
      ).forEach(countSkill);

    });

    emailJobs.forEach((job) => {
      extractSkills(
        `${job.subject || ""} ${job.snippet || ""}`
      ).forEach(countSkill);
    });

    const topSkills =
      Object.entries(skills)

      .filter(([, count]) =>
        count >= 1
      )

      .sort(
        (a, b) =>
        b[1] - a[1]
      );

    const totalApplications =
      applications.length;

    const statusCount = (status) =>
      applications.filter(app =>
        app.status === status
      ).length;

    const applied =
      statusCount("APPLIED");

    const interviews =
      statusCount("INTERVIEW");

    const offers =
      statusCount("ACCEPTED");

    const rejected =
      statusCount("REJECTED");

    const organizationCounts = {};

    emailJobs.forEach((job) => {
      const org =
        job.organization || "UNKNOWN";

      if (org === "UNKNOWN") return;

      if (!organizationCounts[org]) {
        organizationCounts[org] = {
          organization: org,
          total: 0,
          interviews: 0,
          offers: 0
        };
      }

      organizationCounts[org].total += 1;

      if (job.type === "INTERVIEW") {
        organizationCounts[org].interviews += 1;
      }

      if (job.type === "OFFER") {
        organizationCounts[org].offers += 1;
      }
    });

    const topOrganizations =
      Object.values(organizationCounts)
        .sort((a, b) =>
          b.total - a.total
        )
        .slice(0, 5);

    const userSkills =
      new Set(
        (user?.skills || []).map(skill =>
          skill.toLowerCase()
        )
      );

    const missingSkills =
      topSkills
        .map(([skill]) => skill)
        .filter(skill =>
          !userSkills.has(
            String(skill).toLowerCase()
          )
        )
        .slice(0, 5);

    const sourceCounts = {};

    jobs.forEach((job) => {
      const source =
        normalizeSource(job.source);

      sourceCounts[source] =
        (sourceCounts[source] || 0) + 1;
    });

    const sourceBreakdown =
      Object.entries(sourceCounts)
        .map(([source, count]) => ({
          source,
          count,
          percentage:
            rate(count, jobs.length)
        }))
        .sort((a, b) => b.count - a.count);

    const locationCounts = {};

    jobs.forEach((job) => {
      const location =
        job.location || "Unknown";

      locationCounts[location] =
        (locationCounts[location] || 0) + 1;
    });

    const topLocations =
      Object.entries(locationCounts)
        .map(([location, count]) => ({
          location,
          count
        }))
        .filter(item =>
          item.count >= 1
        )
        .sort((a, b) =>
          b.count - a.count ||
          a.location.localeCompare(
            b.location
          )
        );

    const jobsWithApplyLink =
      jobs.filter(job =>
        Boolean(job.applyLink)
      ).length;

    const trustedInbox =
      emailJobs.filter(job =>
        job.trust === "🟢 Trusted" ||
        job.trust === "ðŸŸ¢ Trusted"
      ).length;

    const reviewInbox =
      emailJobs.filter(job =>
        job.trust === "🟡 Needs Review" ||
        job.trust === "ðŸŸ¡ Needs Review"
      ).length;

    const highPriorityInbox =
      emailJobs.filter(job =>
        String(job.priority).toUpperCase() === "HIGH"
      ).length;

    const averageOpportunityScore =
      emailJobs.length
        ? Math.round(
            emailJobs.reduce(
              (sum, job) =>
                sum + (job.opportunityScore || 0),
              0
            ) / emailJobs.length
          )
        : 0;

    const skillCoverage =
      topSkills.length
        ? rate(
            topSkills.length - missingSkills.length,
            topSkills.length
          )
        : 0;

    const readinessScore =
      Math.round(
        (
          skillCoverage * 0.45
        ) +
        (
          rate(jobsWithApplyLink, jobs.length) * 0.25
        ) +
        (
          rate(trustedInbox, emailJobs.length || 1) * 0.20
        ) +
        (
          Math.min(totalJobs, 100) * 0.10
        )
      );

    res.json({

      totalJobs,
      topSkills,
      careerReadiness: {
        score: readinessScore,
        skillCoverage,
        marketAccess:
          rate(jobsWithApplyLink, jobs.length),
        trustedInbox,
        highPriorityInbox
      },

      market: {
        sourceBreakdown,
        topLocations,
        applyLinkCoverage: {
          withLinks: jobsWithApplyLink,
          withoutLinks:
            jobs.length - jobsWithApplyLink,
          percentage:
            rate(jobsWithApplyLink, jobs.length)
        }
      },

      inboxQuality: {
        total: emailJobs.length,
        trusted: trustedInbox,
        needsReview: reviewInbox,
        highPriority: highPriorityInbox,
        averageOpportunityScore
      },

      rates: {
        applicationRate:
          rate(applied, totalApplications),
        interviewRate:
          rate(interviews, totalApplications),
        offerRate:
          rate(offers, totalApplications),
        rejectionRate:
          rate(rejected, totalApplications)
      },

      organizations: {
        topHiringOrganizations:
          topOrganizations,
        interviewCounts:
          topOrganizations.map(org => ({
            organization:
              org.organization,
            count:
              org.interviews
          })),
        offerCounts:
          topOrganizations.map(org => ({
            organization:
              org.organization,
            count:
              org.offers
          }))
      },

      skillDemand: {
        topSkills,
        trendingSkills:
          topSkills,
        missingSkills
      }

    });

  }

  catch (err) {

    res.status(500)
    .json({

      message:
      "Analytics failed"

    });

  }

});

module.exports =
router;
