const Application =
  require("../models/Application");
const applicationService =
  require(
    "../services/applicationService"
  );

const getByStatus =
  async (
    req,
    res,
    status
  ) => {

    try {

      const applications =
        await applicationService
          .getApplicationsByStatus(
            req.user.id,
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
        await Application.find({
          user: req.user.id
        })
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
      req,
      res,
      "APPLIED"
    );

  };

exports.getInterviewApplications =
  async (req, res) => {

    return getByStatus(
      req,
      res,
      "INTERVIEW"
    );

  };

exports.getAcceptedApplications =
  async (req, res) => {

    return getByStatus(
      req,
      res,
      "ACCEPTED"
    );

  };

exports.getRejectedApplications =
  async (req, res) => {

    return getByStatus(
      req,
      res,
      "REJECTED"
    );

  };
