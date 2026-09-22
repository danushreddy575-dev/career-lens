const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const Job = require("../models/Job");
const User = require("../models/User");
const EmailJob = require("../models/EmailJob");
const analyzeSkillGap = require("../utils/skillGap");
const normalizeSkill = require("../utils/normalizeSkill");
const extractSkills = require("../utils/skillExtractor");
const {
  scoreSkillsToLearn
} = require("../services/skillInsightScoringService");
const {
  getVisibleJobQuery
} = require("../utils/jobLifecycle");

const getUserIdFromRequest = (req) => {
  const authHeader =
    req.headers.authorization || "";

  if (
    !authHeader.startsWith("Bearer ")
  ) {
    return null;
  }

  try {
    return jwt.verify(
      authHeader.split(" ")[1],
      process.env.JWT_SECRET
    ).id;
  } catch (err) {
    return null;
  }
};

router.post("/analyze", async (req, res) => {
  try {

    let { skills } = req.body;
    const userId =
      getUserIdFromRequest(req);

    if (!skills) {
      const user =
        userId
          ? await User.findById(
              userId
            ).select("skills")
          : null;

      skills = user?.skills || [];
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: "Skills array required"
      });
    }

    const normalizedUserSkills =
      [...new Set(
        skills
          .map(normalizeSkill)
          .filter(Boolean)
      )];

    const user =
      userId
        ? await User.findById(
            userId
          ).select(
            "skills preferredLocation preferredJobType"
          )
        : null;

    const [
      jobs,
      emailJobs
    ] = await Promise.all([
      Job.find(
        getVisibleJobQuery()
      )
        .select(
          "title company location description skills source applyLink lastSeenAt postedAt createdAt"
        )
        .limit(800),
      userId
        ? EmailJob.find({
            user: userId
          })
            .select(
              "subject snippet organization type mlType opportunityLink opportunityScore createdAt updatedAt"
            )
            .limit(300)
        : []
    ]);

    const marketSkillCounts = {};

    const countSkill = (skill) => {
      const normalized =
        normalizeSkill(skill);

      if (!normalized) return;

      marketSkillCounts[normalized] =
        (marketSkillCounts[normalized] || 0) + 1;
    };

    jobs.forEach(job => {
      [
        ...(job.skills || []),
        ...extractSkills(
          `${job.title || ""} ${job.description || ""}`
        )
      ].forEach(countSkill);
    });

    const marketSkills =
      Object.entries(marketSkillCounts)
        .filter(([, count]) => count >= 1)
        .sort((a, b) =>
          b[1] - a[1] ||
          a[0].localeCompare(b[0])
        );

    const matched =
      marketSkills
        .filter(([skill]) =>
          normalizedUserSkills.includes(skill)
        )
        .map(([skill]) => skill);

    const missing =
      marketSkills
        .filter(([skill]) =>
          !normalizedUserSkills.includes(skill)
        )
        .map(([skill]) => skill);

    const totalDemand =
      marketSkills.reduce(
        (sum, [, count]) => sum + count,
        0
      );

    const matchedDemand =
      marketSkills.reduce(
        (sum, [skill, count]) =>
          normalizedUserSkills.includes(skill)
            ? sum + count
            : sum,
        0
      );

    const matchPercentage =
      totalDemand === 0
        ? 0
        : Math.round(
            (matchedDemand / totalDemand) * 100
          );

    const jobMatches =
      jobs.map(job => {
        const jobSkills =
          [
            ...(job.skills || []),
            ...extractSkills(
              `${job.title || ""} ${job.description || ""}`
            )
          ];

        const analysis =
          analyzeSkillGap(
            normalizedUserSkills,
            [...new Set(jobSkills)]
          );

        return {
          jobId: job._id,
          title: job.title,
          skillsRequired:
            [...new Set(jobSkills.map(normalizeSkill))],
          matched: analysis.matched,
          missing: analysis.missing,
          matchPercentage:
            analysis.matchPercentage
        };
      })
      .sort((a, b) =>
        b.matchPercentage - a.matchPercentage
      )
      .slice(0, 10);

    const skillsToLearn =
      scoreSkillsToLearn({
        userSkills: normalizedUserSkills,
        preferredLocation:
          user?.preferredLocation || "",
        jobs,
        emailJobs,
        limit: 24
      });

    res.json({
      matched,
      missing,
      skillsToLearn,
      matchPercentage,
      totalMarketSkills:
        marketSkills.length,
      marketSkills:
        marketSkills.map(([skill, count]) => ({
          skill,
          count
        })),
      jobMatches
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
