const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const auth =
require("../middleware/authMiddleware");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  saveJob,
  getSavedJobs,
  removeSavedJob
} = require("../controllers/userController");

router.post("/", createUser);
router.get("/",auth,getUsers);

router.post("/:userId/save-job/:jobId", saveJob);
router.get("/:userId/saved-jobs", getSavedJobs);
router.delete("/:userId/save-job/:jobId", removeSavedJob);

router.get("/:id",auth,getUserById);
router.put("/:id",auth,updateUser);
router.delete("/:id",auth,deleteUser);

module.exports = router;