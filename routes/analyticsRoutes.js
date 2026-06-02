const express = require("express");

const router = express.Router();

const Job = require("../models/Job");
const User = require("../models/User");

router.get("/", async (req, res) => {

  try {

    const totalJobs =
      await Job.countDocuments();

    const totalUsers =
      await User.countDocuments();

    const jobs =
      await Job.find();

    const skills = {};

    jobs.forEach((job) => {

      (job.skills || [])
      .forEach((skill) => {

        skills[skill] =
          (skills[skill] || 0)
          + 1;

      });

    });

    const topSkills =
      Object.entries(skills)

      .sort(
        (a, b) =>
        b[1] - a[1]
      )

      .slice(0, 5);

    res.json({

      totalJobs,

      totalUsers,

      topSkills

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