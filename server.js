const dotenv = require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const jobRoutes = require("./routes/jobRoutes");
const errorHandler = require("./middleware/errorHandler");
const skillGapRoutes = require("./routes/skillGapRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes =require("./routes/authRoutes");
const liveRoutes =require("./routes/liveJobsRoutes");
const startScheduler =require("./scheduler/jobScheduler");
const analyticsRoutes =require("./routes/analyticsRoutes");
const gmailRoutes =require("./routes/gmailRoutes");
const applicationRoutes =require("./routes/applicationRoutes");
const dashboardRoutes =
  require("./routes/dashboardRoutes");
const app = express();
connectDB();
startScheduler();
app.use(cors());
app.use(express.json());
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/skill-gap", skillGapRoutes);
app.use(morgan("dev"));
app.use("/api/users", userRoutes);
app.use("/api/auth",authRoutes);
app.get("/", (req, res) => {
res.send("CareerLens API Running");});
app.get("/health", (req, res) => {
res.json({ status: "ok" });
});
app.use("/jobs", jobRoutes);
app.use(
"/api/live-jobs",
liveRoutes
);
app.use(
"/api/analytics",
analyticsRoutes
);
app.use(
"/api/gmail",
gmailRoutes
);
app.use(
  "/api/applications",
  applicationRoutes
);
app.use(
  "/api/dashboard",
  dashboardRoutes
);
// GLOBAL ERROR HANDLER
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
console.log("CLIENT ID:", process.env.GMAIL_CLIENT_ID);
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});