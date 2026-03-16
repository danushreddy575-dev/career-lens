const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");

const connectDB = require("./config/db");
const jobRoutes = require("./routes/jobRoutes");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use(morgan("dev"));

app.get("/", (req, res) => {
res.send("CareerLens API Running");
});

app.get("/health", (req, res) => {
res.json({ status: "ok" });
});

app.use("/jobs", jobRoutes);

// GLOBAL ERROR HANDLER
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});