const recommendationEngine = require("../utils/recommendationEngine");
const Job = require("../models/Job");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  getVisibleJobQuery
} = require("../utils/jobLifecycle");

const getUserIdFromRequest = (req) => {
  const authHeader =
    req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
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

const escapeRegex = (value = "") =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const parseLocationParts = (location = "") => {
  const parts =
    String(location || "")
      .toLowerCase()
      .split(/[,\n;/|]+/)
      .map(part => part.trim())
      .filter(Boolean);

  return {
    city: parts[0] || "",
    state: parts[1] || "",
    country:
      parts[2] ||
      "india",
    parts
  };
};


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
    const preferredLocation =
      String(
        req.query.preferredLocation || ""
      ).trim();
    const experienceLevel =
      String(
        req.query.experienceLevel || ""
      ).trim();

    const skip = (page - 1) * limit;

    const query =
      getVisibleJobQuery();

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

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    const userId =
      getUserIdFromRequest(req);

    const user =
      userId
        ? await User.findById(userId)
            .select("preferredLocation")
        : null;

    const effectivePreferredLocation =
      preferredLocation ||
      user?.preferredLocation ||
      "";

    let jobs;

    if (effectivePreferredLocation) {
      const locationParts =
        parseLocationParts(
          effectivePreferredLocation
        );

      const cityRegex =
        locationParts.city
          ? escapeRegex(locationParts.city)
          : null;

      const stateRegex =
        locationParts.state
          ? escapeRegex(locationParts.state)
          : null;

      const countryRegex =
        locationParts.country
          ? escapeRegex(locationParts.country)
          : "india";

      jobs = await Job.aggregate([
        { $match: query },
        {
          $addFields: {
            locationPriority: {
              $switch: {
                branches: [
                  ...(cityRegex
                    ? [{
                        case: {
                          $regexMatch: {
                            input: {
                              $ifNull: [
                                "$location",
                                ""
                              ]
                            },
                            regex: cityRegex,
                            options: "i"
                          }
                        },
                        then: 4
                      }]
                    : []),
                  ...(stateRegex
                    ? [{
                        case: {
                          $regexMatch: {
                            input: {
                              $ifNull: [
                                "$location",
                                ""
                              ]
                            },
                            regex: stateRegex,
                            options: "i"
                          }
                        },
                        then: 3
                      }]
                    : []),
                  {
                    case: {
                      $regexMatch: {
                        input: {
                          $ifNull: [
                            "$location",
                            ""
                          ]
                        },
                        regex: "remote",
                        options: "i"
                      }
                    },
                    then: 2
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: {
                          $ifNull: [
                            "$location",
                            ""
                          ]
                        },
                        regex: countryRegex,
                        options: "i"
                      }
                    },
                    then: 1
                  }
                ],
                default: 0
              }
            }
          }
        },
        {
          $sort: {
            locationPriority: -1,
            createdAt: -1
          }
        },
        { $skip: skip },
        { $limit: limit }
      ]);
    } else {
      jobs = await Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    const total = await Job.countDocuments(query);

    res.json({
      page,
      limit,
      total,
      preferredLocation:
        effectivePreferredLocation,
      jobs
    });

  } catch (error) {
    next(error);
  }

};



// GET SINGLE JOB
exports.getJobById = async (req, res, next) => {

  try {

    const job = await Job.findOne({
      _id: req.params.id,
      ...getVisibleJobQuery()
    });

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

    const query =
      getVisibleJobQuery();

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
          applyLink: job.applyLink,
          applySource: job.applySource,
          experienceLevel:
            job.experienceLevel,
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
