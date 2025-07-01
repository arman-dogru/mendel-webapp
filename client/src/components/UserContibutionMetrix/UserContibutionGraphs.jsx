import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getUserContributorActivityOverTime } from "../../utils/api";

const ERROR_TYPES = {
  MISSING_PARAM: "Owner, repository, or contributor name is required",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  API_ERROR: "Error from API. Repository or contributor data may not exist.",
  UNKNOWN_ERROR: "Failed to load contributor activity. Please try again later.",
};

const UserContributionGraph = () => {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prFilter, setPrFilter] = useState("prs");
  const [timePeriod, setTimePeriod] = useState("3months");
  const { owner, repo, contributor } = useParams();

  const generateTimeIntervals = (period, repoCreatedAt) => {
    const now = new Date();
    const intervals = [];

    let intervalDays, totalIntervals, formatOptions;

    switch (period) {
      case "3months":
        intervalDays = 7;
        totalIntervals = 13;
        formatOptions = { month: "short", day: "numeric" };
        break;
      case "6months":
        intervalDays = 15;
        totalIntervals = 12;
        formatOptions = { month: "short", day: "numeric" };
        break;
      case "1year":
        intervalDays = 30;
        totalIntervals = 12;
        formatOptions = { month: "short", year: "2-digit" };
        break;
      default:
        intervalDays = 7;
        totalIntervals = 13;
        formatOptions = { month: "short", day: "numeric" };
    }

    const repoCreated = repoCreatedAt ? new Date(repoCreatedAt) : null;

    for (let i = 0; i < totalIntervals; i++) {
      const intervalEnd = new Date(now);
      intervalEnd.setDate(now.getDate() - i * intervalDays);

      const intervalStart = new Date(intervalEnd);
      intervalStart.setDate(intervalEnd.getDate() - intervalDays + 1);

      const isBeforeRepo = repoCreated && intervalEnd < repoCreated;

      const label = intervalStart.toLocaleDateString("en-US", formatOptions);

      intervals.unshift({
        start: intervalStart,
        end: intervalEnd,
        label,
        date: intervalEnd.toISOString().split("T")[0],
        isBeforeRepo,
        fullRange: `${intervalStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${intervalEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
      });
    }

    return intervals;
  };

  const transformDataForIntervals = (apiData, intervals, dataKey) => {
    if (!apiData || !Array.isArray(apiData)) return [];

    return intervals.map((interval) => {
      if (interval.isBeforeRepo) {
        return {
          date: interval.label,
          [dataKey]: 0,
          isBeforeRepo: true,
          originalDates: [],
          fullRange: interval.fullRange,
        };
      }

      const intervalData = apiData.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= interval.start && itemDate <= interval.end;
      });
      const branchNames = intervalData
        .map((item) => item.branchName)
        .filter(Boolean);
      const originalDates = intervalData.map((item) => ({
        date: item.date,
        value: item.value || item.avgTimeToMerge || 0,
      }));

      let value = 0;
      if (dataKey === "avgTimeToMerge") {
        const validData = intervalData.filter(
          (item) => item.avgTimeToMerge > 0
        );
        if (
          intervalData.length > 0 &&
          activityData?.totalStats?.overallAvgTimeToMerge
        ) {
          value = activityData.totalStats.overallAvgTimeToMerge;
        }
        if (validData.length > 0) {
          const sum = validData.reduce(
            (acc, item) => acc + (item.avgTimeToMerge || 0),
            0
          );
          value = Math.round((sum / validData.length) * 10) / 10;
        }
      } else {
        value = intervalData.reduce((acc, item) => acc + (item.value || 0), 0);
      }

      return {
        date: interval.label,
        [dataKey]: value,
        originalDates,
        isBeforeRepo: false,
        fullRange: interval.fullRange,
        branchName: branchNames.length > 0 ? branchNames.join(", ") : undefined,
      };
    });
  };

  const transformedData = useMemo(() => {
    if (!activityData) {
      return {
        prMergeChartData: [],
        branchChartData: [],
        timeToMergeChartData: [],
      };
    }

    const intervals = generateTimeIntervals(
      timePeriod,
      activityData.totalStats?.startDate
    );

    return {
      prMergeChartData: transformDataForIntervals(
        activityData.prMergeData,
        intervals,
        "totalPRsMerged"
      ),
      branchChartData: transformDataForIntervals(
        activityData.branchCreationData,
        intervals,
        "branchesCreated"
      ),
      timeToMergeChartData: transformDataForIntervals(
        activityData.timeToMergeData,
        intervals,
        "avgTimeToMerge"
      ),
    };
  }, [activityData, timePeriod]);

  // Fetch data using the API
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!owner || !repo || !contributor) {
        setError(ERROR_TYPES.MISSING_PARAM);
        setLoading(false);
        return;
      }

      try {
        // Set appropriate loading state
        if (activityData) {
          setFilterLoading(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const data = await getUserContributorActivityOverTime(
          owner,
          repo,
          contributor,
          timePeriod
        );

        setActivityData(data);
        setLoading(false);
        setFilterLoading(false);
      } catch (err) {
        console.error("Error fetching contributor activity:", err);
        if (err.message?.includes("network") || err.name === "NetworkError") {
          setError(ERROR_TYPES.NETWORK_ERROR);
        } else if (err.status === 404 || err.message?.includes("not found")) {
          setError(ERROR_TYPES.API_ERROR);
        } else {
          setError(ERROR_TYPES.UNKNOWN_ERROR);
        }
        setLoading(false);
        setFilterLoading(false);
      }
    };

    fetchActivityData();
  }, [owner, repo, contributor, timePeriod]);

  const handlePRFilterChange = (filter) => {
    setPrFilter(filter);
  };

  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg max-w-xs">
          {data.isBeforeRepo ? (
            <p className="text-gray-400 text-sm">Before repository creation</p>
          ) : (
            <>
              <div className="mb-2">
                <p className="font-semibold text-sm text-gray-300">
                  Period: {data.fullRange}
                </p>
                <p className="font-medium" style={{ color: payload[0].color }}>
                  {payload[0].name}: {payload[0].value}
                  {payload[0].dataKey === "avgTimeToMerge" ? " hours" : ""}
                </p>
              </div>

              {data.originalDates.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-gray-300 text-xs font-semibold mb-1">
                    Detailed events:
                  </p>
                  <ul className="space-y-1">
                    {data.originalDates.map((event, idx) => (
                      <li key={idx} className="text-xs text-gray-400">
                        {event.date}: {event.value}
                        {payload[0].dataKey === "avgTimeToMerge"
                          ? " hours"
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading component for individual graph boxes
  const GraphLoader = ({ height = "64" }) => (
    <div
      className={`flex justify-center items-center h-${height} md:h-80 lg:h-96`}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div>
    </div>
  );

  // Initial loading state - shows when component first loads
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
        <p className="mb-2 font-semibold">{error}</p>
        <p className="text-sm">
          Make sure the repository and contributor exist and are accessible.
        </p>
      </div>
    );
  }

  if (!activityData) {
    return (
      <div className="p-4 text-gray-500 bg-gray-100 rounded dark:bg-gray-900 dark:text-gray-200">
        <p className="font-semibold">
          No activity data available for this contributor.
        </p>
        <p className="text-sm mt-2">
          Ensure the contributor has recent activity in the repository.
        </p>
      </div>
    );
  }

  const { totalStats } = activityData;
  const { prMergeChartData, branchChartData, timeToMergeChartData } =
    transformedData;

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-cardBg mb-8 fade-in border-t border-border">
      <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-6 md:mb-8 text-primary">
        Contributor Activity Graphs
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Pull Request Activity Chart */}
        <div className="bg-cardBg p-4 md:p-6 rounded-lg shadow-sm border border-border slide-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
            <h3 className="text-lg md:text-xl font-semibold text-primary">
              Pull Request Activity
            </h3>
            <div className="flex space-x-2 text-xs md:text-sm">
              <button
                onClick={() => handlePRFilterChange("prs")}
                disabled={filterLoading}
                className={`px-2 py-1 rounded-md font-medium border text-xs transition-opacity ${
                  prFilter === "prs" ? "bg-red-600 text-white" : "text-gray-300"
                } ${filterLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                PRs Merged
              </button>
              <button
                onClick={() => handlePRFilterChange("branches")}
                disabled={filterLoading}
                className={`px-2 py-1 rounded-md font-medium border text-xs transition-opacity ${
                  prFilter === "branches"
                    ? "bg-green-600 text-white"
                    : "text-gray-300"
                } ${filterLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Branches
              </button>
              <select
                value={timePeriod}
                onChange={(e) => handleTimePeriodChange(e.target.value)}
                disabled={filterLoading}
                className={`px-3 py-2 rounded-md font-medium border text-gray-200 border-gray-600 focus:outline-none transition-opacity ${
                  filterLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{ backgroundColor: "var(--background)" }}
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          </div>

          {filterLoading ? (
            <GraphLoader />
          ) : (
            <div className="h-64 md:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prFilter === "prs" ? prMergeChartData : branchChartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(107, 114, 128, 0.3)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    scale="point"
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  {prFilter === "prs" && (
                    <Line
                      type="monotone"
                      dataKey="totalPRsMerged"
                      name="Total PRs Merged"
                      stroke="#f87171"
                      activeDot={{ r: 8 }}
                      strokeWidth={3}
                      dot={{ fill: "#f87171", strokeWidth: 2, r: 4 }}
                      animationDuration={1000}
                    />
                  )}
                  {prFilter === "branches" && (
                    <Line
                      type="monotone"
                      dataKey="branchesCreated"
                      name="Branches Created"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      animationDuration={1000}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4 text-sm">
            <div className="text-center px-4 py-3 bg-background rounded summary-stat border border-border">
              <div className="text-red-400 font-semibold text-lg">
                {totalStats.totalPRsMerged}
              </div>
              <div className="text-secondary font-semibold">Total PRs</div>
            </div>
            <div className="text-center px-4 py-3 bg-background rounded summary-stat border border-border">
              <div className="text-green-500 font-semibold text-lg">
                {totalStats.totalBranchesCreated}
              </div>
              <div className="text-secondary font-semibold">
                Total Branches Created
              </div>
            </div>
          </div>
        </div>

        {/* Merge Time Analysis Chart */}
        <div className="bg-cardBg p-4 md:p-6 rounded-lg shadow-sm border border-border slide-in xl:border-l-2 xl:border-l-border xl:pl-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              Merge Time Analysis
            </h3>
          </div>

          {filterLoading ? (
            <GraphLoader />
          ) : (
            <div className="h-64 md:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeToMergeChartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(107, 114, 128, 0.3)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    scale="point"
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgTimeToMerge"
                    name="Avg Time to Merge"
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4 text-sm">
            <div className="text-center px-4 py-3 bg-background rounded summary-stat border border-border">
              <div className="text-blue-500 font-semibold text-lg">
                {totalStats.overallAvgTimeToMerge} hours
              </div>
              <div className="text-secondary font-semibold">
                Avg Time to Merge
              </div>
            </div>
            <div className="text-center px-4 py-3 bg-background rounded summary-stat border border-border">
              <div className="text-blue-400 font-semibold text-lg">
                {totalStats.totalPRsMerged}
              </div>
              <div className="text-secondary font-semibold">
                Total PRs Merged
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserContributionGraph;
