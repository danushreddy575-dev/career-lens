const recommendationEngine = require("../utils/recommendationEngine");
const Job = require("../models/Job");


// CREATE JOB
exports.createJob = async (req, res, next) => {
  try {

    const { title, company, location } = req.body;

    // basic validation
    if (!title || !company || !location) {
      return res.status(400).json({
        message: "Title, company and location are required"
      });
    }

    const job = new Job(req.body);

    const savedJob = await job.save();

    res.status(201).json(savedJob);

  } catch (error) {
    next(error);
  }
};



// GET JOBS (pagination + filtering)
exports.getJobs = async (req, res, next) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const query = {};

    // filtering by location
    if (req.query.location) {
      query.location = req.query.location;
    }

    // filtering by company
    if (req.query.company) {
      query.company = req.query.company;
    }

    // filtering by skill
    if (req.query.skill) {
      query.skills = { $in: [req.query.skill] };
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(query);

    res.json({
      page,
      limit,
      total,
      jobs
    });

  } catch (error) {
    next(error);
  }

};



// GET SINGLE JOB
exports.getJobById = async (req, res, next) => {

  try {

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    res.json(job);

  } catch (error) {
    next(error);
  }

};



// UPDATE JOB
exports.updateJob = async (req, res, next) => {

  try {

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    res.json(updatedJob);

  } catch (error) {
    next(error);
  }

};



// DELETE JOB
exports.deleteJob = async (req, res, next) => {

  try {

    const deletedJob = await Job.findByIdAndDelete(req.params.id);

    if (!deletedJob) {
      return res.status(404).json({
        message: "Job not found"
      });
    }

    res.json({
      message: "Job deleted successfully"
    });

  } catch (error) {
    next(error);
  }

};
exports.searchJobs = async (req, res) => {
  try {
    const {
      q,
      location,
      skills,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (q) {
      query.$text = { $search: q };
    }

    if (location) {
      query.location = {
        $regex: location,
        $options: "i"
      };
    }

    let jobs;

    if (q) {
      jobs = await Job.find(
        query,
        { score: { $meta: "textScore" } }
      ).sort({
        score: { $meta: "textScore" }
      }).lean();
    } else {
      jobs = await Job.find(query);
    }
    const userSkills = skills
      ? skills.split(",").map(skill => skill.trim())
      : [];

    let rankedJobs = jobs
      .map(job => {
        let recommendationScore = 0;
        let matched = [];
        let missing = [];

        if (userSkills.length > 0) {
          const recommendation = recommendationEngine(userSkills, job);

          if (!recommendation) return null;

          recommendationScore = recommendation.score;
          matched = recommendation.matched;
          missing = recommendation.missing;
        }

        const textScore = job.score || 0;

        const finalScore = Math.round(
          recommendationScore * 0.7 + textScore * 10 * 0.3
        );

        return {
          jobId: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          skillsRequired: job.skills || [],
          matched,
          missing,
          recommendationScore,
          textScore,
          finalScore
        };
      })
      .filter(Boolean);

    rankedJobs.sort((a, b) => b.finalScore - a.finalScore);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;

    const paginated = rankedJobs.slice(start, end);

    res.json({
      total: rankedJobs.length,
      page: pageNum,
      limit: limitNum,
      jobs: paginated
    });

  } catch (error) {
    console.error("Advanced search error:", error);

    res.status(500).json({
      message: "Failed to search jobs"
    });
  }
};