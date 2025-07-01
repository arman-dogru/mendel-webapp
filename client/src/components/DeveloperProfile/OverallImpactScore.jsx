import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { getDeveloperImpactScore } from "../../utils/api";
import Loader from "../Loader/Loader";
import GradeCircle from "../DeveloperProfile/GradeCircle";

const OverallImpactScore = ({ owner, repo, contributor }) => {
  const [developerImpactScore, setDeveloperImpactScore] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("last_month");
  const [showTimeframeFilters, setShowTimeframeFilters] = useState(false);
  const [loadingImpactScore, setLoadingImpactScore] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [error, setError] = useState(null);
  const [timeframeOptions, setTimeframeOptions] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const getDevImpactScore = async (timeframe = null) => {
    try {
      setLoadingImpactScore(true);
      setError(null);
      if (!owner || !repo || !contributor) {
        throw new Error("Missing URL parameters");
      }
      const data = await getDeveloperImpactScore(
        owner,
        repo,
        contributor,
        timeframe
      );
      setDeveloperImpactScore(data);
      return data;
    } catch (error) {
      console.error("Error Fetching Dev Impact Score:", error);
      setError(error.message);
      return null;
    } finally {
      setLoadingImpactScore(false);
    }
  };

  const generateTimeframeOptions = (repoCreatedAt) => {
    const now = new Date();
    const createdDate = new Date(repoCreatedAt);
    const createdYear = createdDate.getFullYear();
    const createdMonth = createdDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const options = [
      { value: "last_month", label: "Last Month" },
      { value: "last_3_months", label: "Last 3 Months" },
      { value: "last_6_months", label: "Last 6 Months" },
    ];

    // Calculate months since repository creation
    const monthsSinceCreation =
      (currentYear - createdYear) * 12 + (currentMonth - createdMonth);

    if (monthsSinceCreation >= 12) {
      // If repo is older than 1 year, show last 12 months (excluding current month)
      options.push({ value: "last_year", label: "Last Year" });
    } else {
      // If repo is newer than 1 year, show all months since creation
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      for (let i = 0; i <= monthsSinceCreation; i++) {
        const monthIndex = (createdMonth + i) % 12;
        const year = createdYear + Math.floor((createdMonth + i) / 12);
        const monthName = monthNames[monthIndex];

        if (
          year < currentYear ||
          (year === currentYear && monthIndex <= currentMonth)
        ) {
          options.push({
            value: `${monthName.toLowerCase()}_${year}`,
            label: `${monthName} ${year}`,
          });
        }
      }
    }

    // Always show current month if repo was created before current month
    if (createdDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
      options.push({ value: "current_month", label: "Current Month" });
    }

    return options;
  };

  useEffect(() => {
    setIsCelebrating(true);
    const timer = setTimeout(() => setIsCelebrating(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (owner && repo && contributor) {
        const data = await getDevImpactScore(selectedTimeframe);
        if (data && !initialLoadComplete) {
          const options = generateTimeframeOptions(
            data.data.repository_created_at
          );
          setTimeframeOptions(options);
          setInitialLoadComplete(true);
        }
      }
    };
    fetchData();
  }, [owner, repo, contributor, selectedTimeframe]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".timeframe-filter-container")) {
        setShowTimeframeFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getCurrentTimeframeLabel = () => {
    if (timeframeOptions.length === 0) return "Loading...";
    const selectedOption = timeframeOptions.find(
      (option) => option.value === selectedTimeframe
    );
    return selectedOption ? selectedOption.label : "Impact Score Filter";
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    setShowTimeframeFilters(false);
  };

  const getGradeColor = (grade) => {
    if (grade === "A+" || grade === "A") {
      return {
        primary: "from-emerald-800 to-teal-900",
        secondary: "from-emerald-800/20 to-teal-900/20",
        text: "text-emerald-600",
        glow: "shadow-emerald-800/50",
        particles: "#065f46",
      };
    } else if (grade === "B+" || grade === "B") {
      return {
        primary: "from-blue-800 to-indigo-900",
        secondary: "from-blue-800/20 to-indigo-900/20",
        text: "text-blue-600",
        glow: "shadow-blue-800/50",
        particles: "#1e3a8a",
      };
    } else if (grade === "C+" || grade === "C") {
      return {
        primary: "from-amber-800 to-orange-900",
        secondary: "from-amber-800/20 to-orange-900/20",
        text: "text-amber-600",
        glow: "shadow-amber-800/50",
        particles: "#92400e",
      };
    } else {
      return {
        primary: "from-red-900 to-rose-900",
        secondary: "from-red-900/20 to-rose-900/20",
        text: "text-red-600",
        glow: "shadow-red-900/50",
        particles: "#991b1b",
      };
    }
  };

  if (error) {
    return (
      <div className="card-bg rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors min-h-[150px] sm:min-h-[180px]">
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <p className="text-red-400 mb-4">
              Error loading impact score: {error}
            </p>
            <button
              onClick={() => getDevImpactScore(selectedTimeframe)}
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
    <div className="flex flex-col gap-4">
      {/* Filter Button */}
      <div className="flex justify-end">
        <div className="relative timeframe-filter-container">
          <button
            onClick={() => setShowTimeframeFilters(!showTimeframeFilters)}
            className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors border border-border text-sm sm:text-base"
          >
            <TrendingUp className="w-4 h-4 text-white" />
            {getCurrentTimeframeLabel()}
          </button>
          {showTimeframeFilters && (
            <div className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-card-bg border border-border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs text-secondary font-medium px-3 py-2 border-b border-border">
                  Impact Score Timeframe
                </div>
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeframeChange(option.value)}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-white transition-colors text-sm ${
                      selectedTimeframe === option.value
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

      {/* Impact Score Card */}
      <div className="card-bg rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors min-h-[150px] sm:min-h-[180px]">
        {loadingImpactScore || !developerImpactScore?.data?.score?.grade ? (
          <div className="flex items-center justify-center h-full">
            <Loader size="sm" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex flex-col items-center sm:items-start gap-4 w-full sm:w-auto">
              {/* 3D Grade Circle */}
              <GradeCircle
                developerImpactScore={developerImpactScore}
                isCelebrating={isCelebrating}
              />

              {/* Score Details */}
              <div className="flex flex-col items-center space-y-2 w-full">
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className={`text-3xl sm:text-4xl font-bold ${
                      getGradeColor(developerImpactScore.data.score.grade).text
                    }`}
                  >
                    {developerImpactScore.data.score.total.toFixed(1)}
                  </span>
                  <span className="text-xs sm:text-sm text-secondary dark:text-gray-400">
                    / 100
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Overall Impact Score
                </h2>
              </div>
            </div>

            {/* Right Column - Developer Insights */}
            <div className="flex-1 flex flex-col justify-center space-y-3 sm:space-y-4 sm:border-l sm:border-border sm:pl-6 sm:pl-8 mt-4 sm:mt-0">
              <h3 className="text-lg sm:text-xl font-semibold text-primary dark:text-white">
                Developer Insights
              </h3>
              <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverallImpactScore;
