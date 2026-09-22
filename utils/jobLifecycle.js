const MARKET_JOB_SOURCES = [
  "jsearch",
  "JSearch",
  "adzuna",
  "Adzuna",
  "collector",
  "Collector"
];

const DEFAULT_STALE_DAYS = 14;

const getStaleJobCutoff = (
  days = DEFAULT_STALE_DAYS
) => {
  const cutoff = new Date();
  cutoff.setDate(
    cutoff.getDate() - days
  );
  return cutoff;
};

const getActiveJobQuery = () => ({
  $or: [
    { isActive: true },
    {
      isActive: {
        $exists: false
      }
    }
  ]
});

const getFreshJobQuery = (
  days = DEFAULT_STALE_DAYS
) => {
  const cutoff =
    getStaleJobCutoff(days);

  return {
    ...getActiveJobQuery(),
    $and: [
      {
        $or: [
          {
            lastSeenAt: {
              $gte: cutoff
            }
          },
          {
            lastSeenAt: {
              $exists: false
            },
            createdAt: {
              $gte: cutoff
            }
          }
        ]
      }
    ]
  };
};

const getVisibleJobQuery = () => ({
  ...getFreshJobQuery(),
  applyLink: {
    $nin: [
      null,
      ""
    ],
    $exists: true
  }
});

const markStaleMarketJobsInactive =
  async (
    Job,
    {
      staleAfterDays =
        DEFAULT_STALE_DAYS
    } = {}
  ) => {
    const cutoff =
      getStaleJobCutoff(staleAfterDays);

    const result =
      await Job.updateMany(
        {
          source: {
            $in: MARKET_JOB_SOURCES
          },
          $or: [
            {
              lastSeenAt: {
                $lt: cutoff
              }
            },
            {
              lastSeenAt: {
                $exists: false
              },
              updatedAt: {
                $lt: cutoff
              }
            }
          ],
          isActive: {
            $ne: false
          }
        },
        {
          isActive: false,
          inactiveAt: new Date()
        }
      );

    return result.modifiedCount || 0;
  };

module.exports = {
  DEFAULT_STALE_DAYS,
  MARKET_JOB_SOURCES,
  getActiveJobQuery,
  getFreshJobQuery,
  getVisibleJobQuery,
  markStaleMarketJobsInactive
};
