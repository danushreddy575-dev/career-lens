const express = require("express");
const router = express.Router();

const {
createJob,
getJobs,
getJobById,
updateJob,
deleteJob,
searchJobs
} = require("../controllers/jobController");


router.post("/", createJob);

router.get("/search", searchJobs);

router.get("/", getJobs);

router.get("/:id", getJobById);

router.put("/:id", updateJob);

router.delete("/:id", deleteJob);

module.exports = router;