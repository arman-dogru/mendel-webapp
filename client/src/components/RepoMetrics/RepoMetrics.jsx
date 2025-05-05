/* src/components/RepoMetricsComponent.jsx */
import { useState, useEffect } from "react";
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
import { getRepoMetrics } from "../../utils/api";
import "./RepoMetrics.css";

const ERROR_TYPES = {
  MISSING_PARAM: "Repository name is required",
  INVALID_FORMAT: "Invalid repository format. Expected 'owner/repo'",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  API_ERROR: "Error from GitHub API. Repository may not exist or be private.",
  UNKNOWN_ERROR: "Failed to load repository metrics. Please try again later.",
};

const RepoMetricsComponent = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prFilter, setPrFilter] = useState("prs");

  const { repoFullName } = useParams();

  useEffect(() => {
    const fetchMetrics = async () => {
      // Parameter validation
      if (!repoFullName) {
        setError(ERROR_TYPES.MISSING_PARAM);
        setLoading(false);
        return;
      }

      const parts = repoFullName.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        setError(ERROR_TYPES.INVALID_FORMAT);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [owner, repo] = parts;
        const data = await getRepoMetrics(owner, repo);
        setMetrics(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching repo metrics:", err);

        // Enhanced error handling with specific error messages
        if (err.message?.includes("network") || err.name === "NetworkError") {
          setError(ERROR_TYPES.NETWORK_ERROR);
        } else if (err.status === 404 || err.message?.includes("not found")) {
          setError(ERROR_TYPES.API_ERROR);
        } else {
          setError(ERROR_TYPES.UNKNOWN_ERROR);
        }
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [repoFullName]);

  const handlePRFilterChange = (filter) => {
    setPrFilter(filter);
  };

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
        {/* Added user guidance */}
        <p className="text-sm">
          Make sure the repository exists and is publicly accessible. Format
          should be 'owner/repo'.
        </p>
      </div>
    );
  }

  // Defensive programming to handle potentially undefined metrics data
  const safeMetrics = metrics || {
    prMergeData: [],
    timeToMergeData: [],
    totalStats: {},
  };
  const hasPRData =
    Array.isArray(safeMetrics.prMergeData) &&
    safeMetrics.prMergeData.length > 0;
  const hasTimeData =
    Array.isArray(safeMetrics.timeToMergeData) &&
    safeMetrics.timeToMergeData.length > 0;

  if (!hasPRData) {
    return (
      <div className="p-4 text-gray-500 bg-gray-100 rounded dark:bg-gray-900 dark:text-gray-200">
        <p>No metrics data available for this repository.</p>
        {/* Added user guidance */}
        <p className="text-sm mt-2">
          Ensure the repository has recent pull request activity. New
          repositories or those without merge activity will not show metrics.
        </p>
      </div>
    );
  }

  const hasBranchActivity = safeMetrics.prMergeData.some(
    (data) => (data?.branchesCreated || 0) > 0
  );

  // Safely extract stats with default values
  const totalPRsMerged = safeMetrics.totalStats?.totalPRsMerged || 0;
  const branchesCreated = safeMetrics.totalStats?.branchesCreated || 0;
  const avgTimeToMerge = safeMetrics.totalStats?.avgTimeToMerge || 0;

  return (
    <div className="p-4 md:p-6 rounded-lg mb-8 fade-in">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-primary">
        Repository Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* First Chart - PR Metrics */}
        <div className="p-4 rounded-lg shadow slide-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary">
              Pull Request Activity
            </h3>
            <div className="flex space-x-2 text-xs md:text-sm">
              <button
                onClick={() => handlePRFilterChange("prs")}
                className={`px-2 py-1 rounded ${
                  prFilter === "prs"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                PRs Merged
              </button>
              <button
                onClick={() => handlePRFilterChange("branches")}
                className={`px-2 py-1 rounded ${
                  prFilter === "branches"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                Branches
              </button>
            </div>
          </div>

          <div className="h-64 md:h-80">
            {prFilter === "branches" && !hasBranchActivity ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>No branch creation activity in this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={safeMetrics.prMergeData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(107, 114, 128, 0.3)"
                  />
                  <XAxis dataKey="date" tick={{ fill: "#e5e7eb" }} />
                  <YAxis tick={{ fill: "#e5e7eb" }} />
                  <Tooltip className="recharts-custom-tooltip" />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  {prFilter === "prs" && (
                    <Line
                      type="monotone"
                      dataKey="totalPRsMerged"
                      name="Total PRs Merged"
                      stroke="#f87171"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                  )}
                  {prFilter === "branches" && (
                    <Line
                      type="monotone"
                      dataKey="branchesCreated"
                      name="Branches Created"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex justify-between mt-4 text-sm">
            <div className="text-center px-3 py-2 bg-gray-800 rounded summary-stat">
              <div className="text-red-400 font-bold">{totalPRsMerged}</div>
              <div className="text-gray-400">Total PRs</div>
            </div>
            <div className="text-center px-3 py-2 bg-gray-800 rounded summary-stat">
              <div className="text-green-500 font-bold">{branchesCreated}</div>
              <div className="text-gray-400">Branches</div>
            </div>
          </div>
        </div>

        {/* Second Chart - Time to Merge */}
        <div className="bg-cardBg p-4 rounded-lg shadow slide-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary">
              Merge Time Analysis
            </h3>
          </div>

          <div className="h-64 md:h-80">
            {!hasTimeData ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>No merge time data available for this repository.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={safeMetrics.timeToMergeData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(107, 114, 128, 0.3)"
                  />
                  <XAxis dataKey="date" tick={{ fill: "#e5e7eb" }} />
                  <YAxis tick={{ fill: "#e5e7eb" }} />
                  <Tooltip className="recharts-custom-tooltip" />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgTimeToMerge"
                    name="Avg Time to Merge (days)"
                    stroke="#3b82f6"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex justify-between mt-4 text-sm">
            <div className="text-center px-3 py-2 bg-gray-800 rounded summary-stat">
              <div className="text-blue-500 font-bold">
                {avgTimeToMerge} days
              </div>
              <div className="text-gray-400">Avg Time to Merge</div>
            </div>
            <div className="text-center px-3 py-2 bg-gray-800 rounded summary-stat">
              <div className="text-blue-400 font-bold">{totalPRsMerged}</div>
              <div className="text-gray-400">Total PRs Merged</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoMetricsComponent;
