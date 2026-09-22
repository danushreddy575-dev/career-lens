const cron = require("node-cron");

const collectLiveJobs =
require("../collectors/liveJobCollector");

const CollectorLog =
require("../models/CollectorLog");

const {
  syncAllGmailAccounts
} = require(
  "../services/gmailSyncService"
);

const runJobCollection = async () => {
  console.log(
    "Running collector..."
  );

  const total =
    await collectLiveJobs();

  await CollectorLog.create({

    status:
      "SUCCESS",

    time:
      new Date(),

    message:
      `Collected ${total} jobs`

  });

  console.log(
    `${total} jobs synced`
  );
};

function startScheduler() {

  setTimeout(
    async () => {
      try {
        await runJobCollection();
      } catch (err) {
        console.log(
          "Startup collector failed:",
          err.message
        );
      }
    },
    5000
  );

  cron.schedule(

    "0 */6 * * *",

    async () => {

      try {
        await runJobCollection();

      }

      catch (err) {

        console.log(
          "Scheduler error:",
          err.message
        );

        await CollectorLog.create({

          status:
            "FAILED",

          time:
            new Date(),

          message:
            err.message

        });

      }

    }

  );

  cron.schedule(

  "*/30 * * * *",

  async () => {

    try {

      console.log(
        "Running Gmail sync..."
      );

      await syncAllGmailAccounts();

      console.log(
        "Gmail sync completed"
      );

    }

    catch (err) {

      console.log(
        "Gmail sync failed:",
        err.message
      );

    }

  }

);

  console.log(
    "Scheduler Started"
  );

}

module.exports =
startScheduler;
