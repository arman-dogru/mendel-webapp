import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Filter,
  GitPullRequest,
  Clock,
  MessageSquare,
  Code,
  TrendingUp,
} from "lucide-react";
import { getUserContributionBoxes } from "../../utils/api";
import Loader from "../Loader/Loader";
import OverallImpactScore from "../DeveloperProfile/OverallImpactScore";

const UserContributionBoxes = () => {
  const { owner, repo, contributor } = useParams();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const monthOptions = [
    { value: "", label: "Last Month" },
    { value: "january", label: "January" },
    { value: "february", label: "February" },
    { value: "march", label: "March" },
    { value: "april", label: "April" },
    { value: "may", label: "May" },
    { value: "june", label: "June" },
    { value: "july", label: "July" },
    { value: "august", label: "August" },
    { value: "september", label: "September" },
    { value: "october", label: "October" },
    { value: "november", label: "November" },
    { value: "december", label: "December" },
  ];

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!owner || !repo || !contributor) {
        throw new Error("Missing required URL parameters");
      }
      const data = await getUserContributionBoxes(
        owner,
        repo,
        contributor,
        selectedMonth || null
      );
      setMetrics(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching contribution metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [owner, repo, contributor, selectedMonth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".metrics-filter-container")) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setShowFilters(false);
    setLoading(true);
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  const formatTimeToMerge = (hours) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  if (error) {
    return (
      <div className="bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="card-bg border border-border rounded-lg p-6 sm:p-8 text-center">
            <p className="text-red-400 mb-4">Error loading metrics: {error}</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-accent text-accent-foreground rounded hover:bg-accent/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background p-4 sm:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                Contribution Metrics
              </h1>
              <div className="text-secondary text-xs sm:text-sm">
                {metrics ? (
                  <>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {metrics.dateRange.startDate} to{" "}
                      {metrics.dateRange.endDate}
                      {metrics.dateRange.monthsInRange > 1 &&
                        ` (${metrics.dateRange.monthsInRange} months)`}
                    </span>
                    <div className="mt-1">
                      {metrics.contributor} • {metrics.repository}
                    </div>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2"></span>
                )}
              </div>
            </div>
          </div>

          {/* Overall Impact Score Component */}
          <OverallImpactScore
            owner={owner}
            repo={repo}
            contributor={contributor}
          />
        </div>

        {/* Metrics Filter */}
        <div className="flex justify-end mb-4 sm:mb-6 pr-0 sm:pr-4">
          <div className="relative metrics-filter-container">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors border border-border text-sm sm:text-base"
            >
              <Filter className="w-4 h-4 text-white" />
              {selectedMonth
                ? monthOptions.find((opt) => opt.value === selectedMonth)?.label
                : "Metrics Filter"}
            </button>
            {showFilters && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-card-bg border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-secondary font-medium px-3 py-2 border-b border-border">
                    Contribution Metrics
                  </div>
                  {monthOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleMonthChange(option.value)}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-white transition-colors text-sm ${
                        selectedMonth === option.value
                          ? "bg-accent text-white"
                          : "text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-h-[150px] sm:min-h-[200px]">
          {loading || !metrics ? (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-center">
              <Loader size="sm" />
            </div>
          ) : (
            <>
              <div className="card-bg border border-border rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <GitPullRequest className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-secondary text-xs sm:text-sm font-medium">
                    Total Merged PRs
                  </h3>
                  <div className="text-primary text-xl sm:text-2xl font-bold">
                    {metrics.metrics.prsMetrics.totalPRsMerged}
                  </div>
                  <p className="text-secondary text-xs">
                    Avg: {metrics.metrics.prsMetrics.avgPRsPerMonth}/month
                  </p>
                </div>
              </div>
              <div className="card-bg border border-border rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-secondary text-xs sm:text-sm font-medium">
                    Average Time to Merge
                  </h3>
                  <div className="text-primary text-xl sm:text-2xl font-bold">
                    {formatTimeToMerge(metrics.metrics.avgTimeToMerge.hours)}
                  </div>
                  <p className="text-secondary text-xs">
                    {metrics.metrics.avgTimeToMerge.formatted}
                  </p>
                </div>
              </div>
              <div className="card-bg border border-border rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-secondary text-xs sm:text-sm font-medium">
                    Reviews Performed
                  </h3>
                  <div className="text-primary text-xl sm:text-2xl font-bold">
                    {metrics.metrics.reviewsPerformed}
                  </div>
                  <p className="text-secondary text-xs">
                    Code reviews completed
                  </p>
                </div>
              </div>
              <div className="card-bg border border-border rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Code className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-secondary text-xs sm:text-sm font-medium">
                    Code Churn Rate
                  </h3>
                  <div className="text-primary text-xl sm:text-2xl font-bold">
                    {formatNumber(metrics.metrics.codeChurnRate.total)}
                  </div>
                  <p className="text-secondary text-xs">
                    +{formatNumber(metrics.metrics.codeChurnRate.linesAdded)}-
                    {formatNumber(metrics.metrics.codeChurnRate.linesDeleted)}{" "}
                    lines
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserContributionBoxes;
