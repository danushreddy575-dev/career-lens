const express = require("express");
const router = express.Router();

const Job = require("../models/Job");
const recommendationEngine = require("../utils/recommendationEngine");

router.post("/", async (req, res) => {
  try {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        message: "Please provide an array of skills"
      });
    } 

    const jobs = await Job.find().limit(100);

    let recommendations = jobs
      .map(job => {
        const result = recommendationEngine(skills, job);

        if (!result) return null;

        return {
          jobId: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          skillsRequired: job.skills || [],
          matched: result.matched,
          missing: result.missing,
          recommendationScore: result.score
        };
      })
      .filter(Boolean);

    recommendations.sort(
      (a, b) => b.recommendationScore - a.recommendationScore
    );

    recommendations = recommendations.slice(0, 10);

    res.json({
      total: recommendations.length,
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