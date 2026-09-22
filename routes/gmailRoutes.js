const router = require("express").Router();

const auth = require("../middleware/authMiddleware");


const {
  connectGmail,
  gmailCallback,
  connectionStatus,
  getEmails,
  getInboxJobs,
  getTrustedJobs,
  getReviewJobs,
  getFilteredJobs,
  getInterviewJobs,
  getApplicationJobs,
  getOfferJobs,
  getRejectionJobs,
  getRecruiterInsights
} = require("../controllers/gmailController");

router.get(
  "/connect",
  auth,
  connectGmail
);

router.get(
  "/callback",
  gmailCallback
);

router.get(
  "/status",
  auth,
  connectionStatus
);

router.get(
  "/emails",
  auth,
  getEmails
);

router.get(
  "/inbox",
  auth,
  getInboxJobs
);

router.get(
  "/inbox/trusted",
  auth,
  getTrustedJobs
);

router.get(
  "/inbox/review",
  auth,
  getReviewJobs
);

router.get(
  "/inbox/filtered",
  auth,
  getFilteredJobs
);

router.get(
  "/inbox/interviews",
  auth,
  getInterviewJobs
);

router.get(
  "/inbox/applications",
  auth,
  getApplicationJobs
);

router.get(
  "/inbox/offers",
  auth,
  getOfferJobs
);

router.get(
  "/inbox/rejections",
  auth,
  getRejectionJobs
);

router.get(
  "/recruiters",
  auth,
  getRecruiterInsights
);

module.exports = router;
