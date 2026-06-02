const EmailConnection =
  require("../models/EmailConnection");

const gmailService =
  require("./gmailService");

const syncAllGmailAccounts =
  async () => {

    const connections =
      await EmailConnection.find({
        connected: true
      });

    console.log(
      `Found ${connections.length} Gmail accounts`
    );

    for (const connection of connections) {

      try {

        console.log(
          `Syncing ${connection.email}`
        );

        await gmailService.fetchEmails(
          connection.user
        );

        console.log(
          `Finished ${connection.email}`
        );

      } catch (err) {

        console.log(
          `Failed ${connection.email}:`,
          err.message
        );

      }

    }

};

module.exports = {
  syncAllGmailAccounts
};