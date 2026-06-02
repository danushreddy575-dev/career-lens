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
  getRejectionJobs
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
  getEmails
);

router.get(
  "/inbox",
  getInboxJobs
);

router.get(
  "/inbox/trusted",
  getTrustedJobs
);

router.get(
  "/inbox/review",
  getReviewJobs
);

router.get(
  "/inbox/filtered",
  getFilteredJobs
);

router.get(
  "/inbox/interviews",
  getInterviewJobs
);

router.get(
  "/inbox/applications",
  getApplicationJobs
);

router.get(
  "/inbox/offers",
  getOfferJobs
);

router.get(
  "/inbox/rejections",
  getRejectionJobs
);

module.exports = router;