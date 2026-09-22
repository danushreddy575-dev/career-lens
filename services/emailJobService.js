const EmailJob = require("../models/EmailJob");
const mongoose = require("mongoose");

const getInboxJobs = async (userId, filter = {}) => {
  return EmailJob
    .find({
      user: userId,
      ...filter
    })
    .sort({ createdAt: -1 });
};

const getRecruiterInsights = async (userId) => {
  return EmailJob.aggregate([
    {
      $match: {
        user:
          new mongoose.Types.ObjectId(
            userId
          ),
        recruiterEmail: {
          $nin: [
            "",
            null
          ]
        }
      }
    },
    {
      $group: {
        _id: "$recruiterEmail",
        recruiterEmail: {
          $first: "$recruiterEmail"
        },
        recruiterName: {
          $first: "$recruiterName"
        },
        interactionCount: {
          $sum: 1
        },
        lastInteractionAt: {
          $max: "$updatedAt"
        },
        interviews: {
          $sum: {
            $cond: [
              { $eq: ["$type", "INTERVIEW"] },
              1,
              0
            ]
          }
        },
        offers: {
          $sum: {
            $cond: [
              { $eq: ["$type", "OFFER"] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: {
        interactionCount: -1,
        lastInteractionAt: -1
      }
    },
    {
      $limit: 10
    }
  ]);
};

module.exports = {
  getInboxJobs,
  getRecruiterInsights
};
