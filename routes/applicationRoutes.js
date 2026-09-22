const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/authMiddleware");

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
  auth,
  getApplications,
);

router.get(
  "/status/applied",
  auth,
  getAppliedApplications
);

router.get(
  "/status/interview",
  auth,
  getInterviewApplications
);

router.get(
  "/status/accepted",
  auth,
  getAcceptedApplications
);

router.get(
  "/status/rejected",
  auth,
  getRejectedApplications
);

module.exports = router;
