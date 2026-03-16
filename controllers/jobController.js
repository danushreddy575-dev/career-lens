const Job = require("../models/Job");


// CREATE JOB
exports.createJob = async (req, res) => {
  try {

    const { title, company, location } = req.body;

    if (!title || !company || !location) {
      return res.status(400).json({
        message: "Title, company and location are required"
      });
    }

    const job = new Job(req.body);

    const savedJob = await job.save();

    res.status(201).json(savedJob);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



// GET JOBS (Pagination + Filtering)
exports.getJobs = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.location) {
      query.location = req.query.location;
    }

    if (req.query.company) {
      query.company = req.query.company;
    }

    if (req.query.skill) {
      query.skills = { $in: [req.query.skill] };
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



// GET SINGLE JOB
exports.getJobById = async (req, res) => {
  try {

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



// UPDATE JOB
exports.updateJob = async (req, res) => {
  try {

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(updatedJob);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



// DELETE JOB
exports.deleteJob = async (req, res) => {
  try {

    const deletedJob = await Job.findByIdAndDelete(req.params.id);

    if (!deletedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};