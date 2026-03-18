require("dotenv").config();

const connectDB = require("../config/db");
const Job = require("../models/Job");

const fetchJobs = require("./services/fetchJobs");
const isSimilar = require("../utils/similarity");
const extractSkills = require("../utils/skillExtractor");

const collectJobs = async () => {

  try {

    await connectDB();

    console.log("Starting job collection...");

    const jobs = await fetchJobs();

    let savedCount = 0;
    let skippedCount = 0;

    for (const item of jobs) {

      console.log("Processing:", item.title);

      // 🔍 Get existing jobs from same source
      const existingJobs = await Job.find({
        company: "ExternalSource"
      });

      let isDuplicate = false;

      for (const existing of existingJobs) {

        if (isSimilar(existing.title, item.title)) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        console.log("Fuzzy duplicate skipped:", item.title);
        skippedCount++;
        continue;
      }

      // 🧠 Extract skills from description
      const extractedSkills = extractSkills(item.body || "");

      const job = new Job({
        title: item.title,
        company: "ExternalSource",
        location: "Remote",
        description: item.body,
        skills: extractedSkills,
        source: "collector"
      });

      await job.save();
      savedCount++;
    }

    console.log("\n✅ Job collection completed");
    console.log(`Saved: ${savedCount}`);
    console.log(`Skipped (duplicates): ${skippedCount}`);

    process.exit();

  } catch (error) {

    console.error("❌ Collector error:", error);
    process.exit(1);

  }

};

collectJobs();