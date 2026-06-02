const STATUS_PRIORITY = {
  APPLIED: 1,
  PROCESSING: 2,
  INTERVIEW: 3,
  ACCEPTED: 4,
  REJECTED: 4
};
const Application =
  require("../models/Application");

const shouldUpdateStatus = (
  currentStatus,
  newStatus
) => {

  if (!currentStatus) {
    return true;
  }

  return (
    STATUS_PRIORITY[newStatus] >
    STATUS_PRIORITY[currentStatus]
  );

};

const extractRole = (email) => {

  const subject =
    email.subject || "";

  const patterns = [

    /frontend developer/i,
    /backend developer/i,
    /full stack developer/i,
    /web developer/i,
    /software engineer/i,
    /sde/i,
    /intern/i

  ];

  for (const pattern of patterns) {

    const match =
      subject.match(pattern);

    if (match) {
      return match[0];
    }

  }

  return subject.substring(0, 80);

};

const getStatusFromType = (type) => {

  switch (type) {

    case "APPLICATION":
      return "APPLIED";

    case "INTERVIEW":
      return "INTERVIEW";

    case "OFFER":
      return "ACCEPTED";

    case "REJECTION":
      return "REJECTED";

    default:
      return null;

  }

};

const syncApplicationFromEmail =
  async (userId, email) => {

    const status =
      getStatusFromType(
        email.type
      );

    if (!status) {
      return;
    }

    const role =extractRole(email);

    const company =
      email.organization ||
      "UNKNOWN";

    const existing =
    await Application.findOne({
        user: userId,
        company,
        role
    });

    if (
    existing &&
    !shouldUpdateStatus(
        existing.status,
        status
    )
    ) {
    return;
    }

    await Application.findOneAndUpdate(
      {
        user: userId,
        company,
        role
      },
      {
        user: userId,
        company,
        role,
        source: "EMAIL",
        status
      },
      {
        upsert: true,
        new: true
      }
    );

};

module.exports = {
  syncApplicationFromEmail
};