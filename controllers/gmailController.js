const gmailService = require("../services/gmailService");

const EmailJob = require("../models/EmailJob");

const emailJobService =
  require("../services/emailJobService");

const getJobsByType = async (
  res,
  type
) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        "6a0c6446f0dc236879aa07d7",
        { type }
      );

    return res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getInterviewJobs = async (
  req,
  res
) => {
  return getJobsByType(
    res,
    "INTERVIEW"
  );
};

exports.getApplicationJobs = async (
  req,
  res
) => {
  return getJobsByType(
    res,
    "APPLICATION"
  );
};

exports.getOfferJobs = async (
  req,
  res
) => {
  return getJobsByType(
    res,
    "OFFER"
  );
};

exports.getRejectionJobs = async (
  req,
  res
) => {
  return getJobsByType(
    res,
    "REJECTION"
  );
};

exports.getInboxJobs = async (req, res) => {
  try {

    const jobs = await EmailJob
      .find({
        user: "6a0c6446f0dc236879aa07d7"
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.connectGmail = async (req, res) => {
  try {
    const url = gmailService.generateAuthUrl();

    res.status(200).json({
      success: true,
      authUrl: url
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.gmailCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing"
      });
    }

    const result = await gmailService.handleCallback(
      code,
      "6a0c6446f0dc236879aa07d7"
    );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.connectionStatus = async (req, res) => {
  try {
    const status =
      await gmailService.getConnectionStatus(
        req.user.id
      );

    res.json({
      success: true,
      connected: status
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getEmails = async (req, res) => {
  try {

    const emails =
      await gmailService.fetchEmails(
        "6a0c6446f0dc236879aa07d7"
      );

    res.status(200).json({
      success: true,
      count: emails.length,
      emails
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getTrustedJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        "6a0c6446f0dc236879aa07d7",
        {
          trust: "🟢 Trusted"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getReviewJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        "6a0c6446f0dc236879aa07d7",
        {
          trust: "🟡 Needs Review"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getFilteredJobs = async (req, res) => {
  try {

    const jobs =
      await emailJobService.getInboxJobs(
        "6a0c6446f0dc236879aa07d7",
        {
          trust: "🔴 Filtered"
        }
      );

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};