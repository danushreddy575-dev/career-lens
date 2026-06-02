const EmailJob = require("../models/EmailJob");

const getInboxJobs = async (userId, filter = {}) => {
  return EmailJob
    .find({
      user: userId,
      ...filter
    })
    .sort({ createdAt: -1 });
};

module.exports = {
  getInboxJobs
};