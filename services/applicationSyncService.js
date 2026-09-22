const STATUS_PRIORITY = {
  APPLIED: 1,
  PROCESSING: 2,
  INTERVIEW: 3,
  ACCEPTED: 4,
  REJECTED: 4
};
const Application =
  require("../models/Application");
const EmailJob =
  require("../models/EmailJob");

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

    case "ASSESSMENT":
      return "PROCESSING";

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

const getTimelineEventFromType = (type) => {
  switch (type) {

    case "APPLICATION":
      return "Applied";

    case "ASSESSMENT":
      return "Assessment";

    case "INTERVIEW":
      return "Interview";

    case "OFFER":
      return "Offer";

    case "REJECTION":
      return "Rejected";

    default:
      return null;

  }
};

const getStatusFromTimelineEvent = (event) => {
  switch (event) {

    case "Applied":
      return "APPLIED";

    case "Assessment":
      return "PROCESSING";

    case "Interview":
      return "INTERVIEW";

    case "Offer":
      return "ACCEPTED";

    case "Rejected":
      return "REJECTED";

    default:
      return null;

  }
};

const getStatusFromTimeline = (timeline = []) => {
  return timeline.reduce(
    (best, item) => {
      const status =
        getStatusFromTimelineEvent(
          item.event
        );

      if (!status) return best;

      if (!best) return status;

      return STATUS_PRIORITY[status] >
        STATUS_PRIORITY[best]
        ? status
        : best;
    },
    null
  ) || "TO_APPLY";
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

    const timelineEvent =
      getTimelineEventFromType(
        email.type
      );

    const hasTimelineEvent =
      existing?.timeline?.some(item =>
        item.emailId === email.id &&
        item.event === timelineEvent
      );

    if (
    existing &&
    !shouldUpdateStatus(
        existing.status,
        status
    ) &&
    (
      !timelineEvent ||
      hasTimelineEvent
    )
    ) {
    return;
    }

    const setFields = {
      user: userId,
      company,
      role,
      source: "EMAIL"
    };

    if (
      !existing ||
      shouldUpdateStatus(
        existing.status,
        status
      )
    ) {
      setFields.status = status;
    }

    const update = {
      $set: setFields
    };

    if (
      timelineEvent &&
      !hasTimelineEvent
    ) {
      update.$push = {
        timeline: {
          event: timelineEvent,
          source: "EMAIL",
          emailId: email.id,
          subject:
            email.subject || "",
          occurredAt: new Date()
        }
      };
    }

    await Application.findOneAndUpdate(
      {
        user: userId,
        company,
        role
      },
      update,
      {
        upsert: true,
        new: true
      }
    );

};

const reconcileApplicationTimelines =
  async (userId) => {

    const applications =
      await Application.find({
        user: userId,
        "timeline.0": {
          $exists: true
        }
      });

    let updated = 0;

    for (const application of applications) {

      const emailIds = [
        ...new Set(
          application.timeline
            .map(item => item.emailId)
            .filter(Boolean)
        )
      ];

      const emailJobs =
        await EmailJob.find({
          user: userId,
          emailId: {
            $in: emailIds
          }
        }).select("emailId type");

      const typeByEmailId =
        new Map(
          emailJobs.map(job => [
            job.emailId,
            job.type
          ])
        );

      const timeline =
        application.timeline.filter(item => {
          if (!item.emailId) return true;

          const currentType =
            typeByEmailId.get(
              item.emailId
            );

          if (!currentType) return true;

          return item.event ===
            getTimelineEventFromType(
              currentType
            );
        });

      if (
        timeline.length ===
        application.timeline.length
      ) {
        continue;
      }

      application.timeline = timeline;
      application.status =
        getStatusFromTimeline(timeline);

      if (
        application.source === "EMAIL" &&
        !timeline.length &&
        application.status === "TO_APPLY"
      ) {
        await application.deleteOne();
        updated += 1;
        continue;
      }

      await application.save();
      updated += 1;

    }

    return updated;

  };

module.exports = {
  syncApplicationFromEmail,
  reconcileApplicationTimelines
};
