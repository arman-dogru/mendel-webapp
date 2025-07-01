import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getRepoContributors } from "../../utils/api";
import RepoMetricsComponent from "../RepoMetrics/RepoMetrics";
import GradeCircle from "../DeveloperProfile/GradeCircle";

const TeamsComponents = () => {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { repoFullName } = useParams();
  const [searchParams] = useSearchParams();

  const staticDeveloperImpactScore = {
    data: {
      score: {
        grade: "A+",
        total: 92.5,
      },
    },
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

  useEffect(() => {
    const fetchContributors = async () => {
      if (!repoFullName) return;

      try {
        setLoading(true);
        const [owner, repo] = repoFullName.split("/");
        const data = await getRepoContributors(owner, repo);
        setContributors(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching contributors:", err);
        setError("Failed to load contributors data");
        setLoading(false);
      }
    };

    fetchContributors();
  }, [repoFullName]);

  const handleViewDetails = (contributor) => {
    if (!repoFullName) return;
    const [owner, repo] = repoFullName.split("/");
    navigate(
      `/user/${owner}/${repo}/${
        contributor.login || contributor.name
      }?tab=Profile`
    );
  };

  const handleContributorNameClick = (contributor) => {
    if (!repoFullName) return;
    const [owner, repo] = repoFullName.split("/");
    navigate(
      `/user/${owner}/${repo}/${
        contributor.login || contributor.name
      }?tab=Profile`
    );
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
        {error} - Please try again later.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Grade Circle and Developer Insights Section */}
        <div className="card-bg rounded-lg p-4 sm:p-6 hover:border-accent/50 transition-colors min-h-[150px] sm:min-h-[180px] mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex flex-col items-center sm:items-start gap-4 w-full sm:w-auto">
              {/* 3D Grade Circle */}
              <GradeCircle
                developerImpactScore={staticDeveloperImpactScore}
                isCelebrating={true}
              />

              {/* Score Details */}
              <div className="flex flex-col items-center space-y-2 w-full">
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className={`text-3xl sm:text-4xl font-bold ${
                      getGradeColor(staticDeveloperImpactScore.data.score.grade)
                        .text
                    }`}
                  >
                    {staticDeveloperImpactScore.data.score.total.toFixed(1)}
                  </span>
                  <span className="text-xs sm:text-sm text-secondary dark:text-gray-400">
                    / 100
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold">
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
        </div>

        {/* Repository Analytics Section */}
        <RepoMetricsComponent />

        {/* Repository Contributors Section */}
        <div className="mt-8 md:mt-12 lg:mt-16">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-6 md:mb-8 text-primary border-t border-border pt-6">
            Repository Contributors
          </h2>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full border-collapse min-w-full border-t border-border">
                <thead>
                  <tr className="bg-cardBg border-b border-border">
                    <th className="p-3 lg:p-4 text-left text-primary font-semibold text-sm lg:text-base">
                      Name
                    </th>
                    <th className="p-3 lg:p-4 text-left text-primary font-semibold text-sm lg:text-base">
                      Contributions
                    </th>
                    <th className="p-3 lg:p-4 text-center text-primary font-semibold text-sm lg:text-base">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((contributor, index) => (
                    <tr
                      key={index}
                      className="border-b border-border transition-colors duration-150"
                    >
                      <td className="p-3 lg:p-4 text-primary text-sm lg:text-base">
                        <button
                          onClick={() =>
                            handleContributorNameClick(contributor)
                          }
                          className="font-semibold text-primary text-left w-full transition-all duration-200 ease-in-out 
                             hover:text-accent hover:underline hover:scale-[1.02]"
                        >
                          {contributor.name}
                        </button>
                      </td>
                      <td className="p-3 lg:p-4 text-primary text-sm lg:text-base">
                        <span className="font-semibold">
                          {contributor.contributions ||
                            contributor.totalPRs ||
                            0}
                        </span>
                      </td>
                      <td className="p-3 lg:p-4 text-center">
                        <button
                          onClick={() => handleViewDetails(contributor)}
                          className="p-2 rounded hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
                          title="View Details"
                          aria-label={`View details for ${contributor.name}`}
                        >
                          <Eye className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {contributors.map((contributor, index) => (
              <div
                key={index}
                className="bg-cardBg p-4 rounded-lg border border-border shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-primary font-semibold text-base truncate cursor-pointer transition-all duration-200 
                             hover:text-accent hover:underline hover:scale-105"
                      onClick={() => handleContributorNameClick(contributor)}
                    >
                      {contributor.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleViewDetails(contributor)}
                    className="ml-3 p-2 rounded hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring flex-shrink-0"
                    title="View Details"
                    aria-label={`View details for ${contributor.name}`}
                  >
                    <Eye className="h-5 w-5 text-primary" />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary font-semibold">
                    Contributions:
                  </span>
                  <span className="font-semibold text-primary">
                    {contributor.contributions || contributor.totalPRs || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {contributors.length === 0 && (
            <div className="text-center p-8 md:p-12 text-secondary bg-cardBg rounded-lg border border-border">
              <div className="flex flex-col items-center max-w-md mx-auto">
                <svg
                  className="w-16 h-16 md:w-20 md:h-20 mb-4 text-secondary opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-lg md:text-xl font-semibold mb-2">
                  No Contributors Found
                </p>
                <p className="text-sm md:text-base text-secondary">
                  This repository doesn't have any contributors data available.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsComponents;
