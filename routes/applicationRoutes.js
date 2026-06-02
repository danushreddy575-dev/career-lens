const express = require("express");

const router = express.Router();

const {
  getApplications,
  getAppliedApplications,
  getInterviewApplications,
  getAcceptedApplications,
  getRejectedApplications
} = require(
  "../controllers/applicationController"
);

router.get(
  "/",
  getApplications,
);

router.get(
  "/status/applied",
  getAppliedApplications
);

router.get(
  "/status/interview",
  getInterviewApplications
);

router.get(
  "/status/accepted",
  getAcceptedApplications
);

router.get(
  "/status/rejected",
  getRejectedApplications
);

module.exports = router;