const express = require("express");
const router = express.Router();

const Job = require("../models/Job");
const analyzeSkillGap = require("../utils/skillGap");

router.post("/analyze", async (req, res) => {
  try {

    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        message: "Skills array required"
      });
    }

    const jobs = await Job.find().limit(50);

    const results = jobs.map(job => {

      const analysis = analyzeSkillGap(skills, job.skills || []);

      return {
        jobId: job._id,
        title: job.title,
        skillsRequired: job.skills,
        matched: analysis.matched,
        missing: analysis.missing,
        matchPercentage: analysis.matchPercentage
      };
    });

    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;