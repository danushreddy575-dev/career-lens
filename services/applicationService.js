const Application =
  require("../models/Application");

const getApplicationsByStatus =
  async (userId, status) => {

    return Application
      .find({
        user: userId,
        status
      })
      .sort({
        updatedAt: -1
      });

  };

module.exports = {
  getApplicationsByStatus
};