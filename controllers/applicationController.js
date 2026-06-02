const Application =
  require("../models/Application");
const applicationService =
  require(
    "../services/applicationService"
  );

const getByStatus =
  async (
    res,
    status
  ) => {

    try {

      const applications =
        await applicationService
          .getApplicationsByStatus(
            "6a0c6446f0dc236879aa07d7",
            status
          );

      return res.json({
        success: true,
        count:
          applications.length,
        applications
      });

    } catch (err) {

      return res.status(500)
        .json({
          success: false,
          message:
            err.message
        });

    }

  };

exports.getApplications =
  async (req, res) => {

    try {

      const applications =
        await Application.find()
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: applications.length,
        applications
      });

    } catch (err) {

      res.status(500).json({
        success: false,
        message: err.message
      });

    }

  };

exports.getAppliedApplications =
  async (req, res) => {

    return getByStatus(
      res,
      "APPLIED"
    );

  };

exports.getInterviewApplications =
  async (req, res) => {

    return getByStatus(
      res,
      "INTERVIEW"
    );

  };

exports.getAcceptedApplications =
  async (req, res) => {

    return getByStatus(
      res,
      "ACCEPTED"
    );

  };

exports.getRejectedApplications =
  async (req, res) => {

    return getByStatus(
      res,
      "REJECTED"
    );

  };