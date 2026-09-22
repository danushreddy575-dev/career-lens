const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const Job = require("../models/Job");
const User = require("../models/User");
const EmailJob = require("../models/EmailJob");
const {
  rankRecommendations
} = require("../services/recommendationEngineService");
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

router.post("/", async (req, res) => {
  try {
    const { skills } = req.body;

    const userId =
      getUserIdFromRequest(req);

    const user =
      userId
        ? await User.findById(
            userId
          ).select(
            "skills preferredLocation preferredJobType"
          )
        : null;

    const effectiveSkills =
      skills || user?.skills || [];

    if (!Array.isArray(effectiveSkills)) {
      return res.status(400).json({
        message: "Please provide an array of skills"
      });
    } 

    const [
      jobs,
      emailJobs
    ] = await Promise.all([
      Job.find(
        getVisibleJobQuery()
      ).limit(500),
      userId
        ? EmailJob.find({
            user: userId
          }).limit(200)
        : []
    ]);

    const recommendations =
      rankRecommendations({
        user,
        skills: effectiveSkills,
        jobs,
        emailJobs,
        limit: 10
      });

    res.json({
      total: recommendations.length,
      preferredLocation:
        user?.preferredLocation || "",
      scoring:
        "tfidf-cosine-similarity",
      recommendations
    });

  } catch (error) {
    console.error("Recommendation error:", error);

    res.status(500).json({
      message: "Failed to generate recommendations"
    });
  }
});

module.exports = router;
