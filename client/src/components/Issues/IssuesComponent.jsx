import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRepo } from "../../context/RepoContext";
import { getRepoIssues } from "../../utils/api";
import { formatDistanceToNow, subWeeks, subMonths } from "date-fns";
import { handleApiError } from "../../utils/errorHandler";

const Issues = () => {
  const { repoFullName } = useParams();
  const { selectedRepo } = useRepo();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const [tagFilter, setTagFilter] = useState("");
  const [milestoneFilter, setMilestoneFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("newest");
  const [allTags, setAllTags] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [allMilestones, setAllMilestones] = useState([]);
  const [authorFilter, setAuthorFilter] = useState("");
  const [timeFrameFilter, setTimeFrameFilter] = useState("all"); // New state for time frame

  const repo = repoFullName ? decodeURIComponent(repoFullName) : selectedRepo;
  const [owner, repoName] = repo ? repo.split("/") : ["", ""];

  useEffect(() => {
    const fetchIssues = async () => {
      if (!owner || !repoName) return;

      try {
        setLoading(true);
        const openIssues = await getRepoIssues(owner, repoName, "open");
        const closedIssues = await getRepoIssues(owner, repoName, "closed");
        const allIssues = [...openIssues, ...closedIssues];

        const tags = new Set();
        const authors = new Set();
        const milestones = new Set();
        allIssues.forEach((issue) => {
          issue.labels.forEach((label) => tags.add(label));
          authors.add(issue.author);
          if (issue.milestone) milestones.add(issue.milestone);
        });
        setAllTags([...tags]);
        setAllAuthors([...authors]);
        setAllMilestones([...milestones]);

        let filteredIssues = authorFilter
          ? allIssues.filter((issue) => issue.author === authorFilter)
          : allIssues;

        filteredIssues = milestoneFilter
          ? filteredIssues.filter(
              (issue) => issue.milestone === milestoneFilter,
            )
          : filteredIssues;

        filteredIssues.sort((a, b) => {
          if (sortFilter === "newest") {
            return new Date(b.createdAt) - new Date(a.createdAt);
          } else if (sortFilter === "oldest") {
            return new Date(a.createdAt) - new Date(b.createdAt);
          }
          return 0;
        });

        setIssues(filteredIssues);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching issues:", err);
        setError(handleApiError(err));
        setLoading(false);
      }
    };

    fetchIssues();
  }, [owner, repoName, authorFilter, milestoneFilter, sortFilter]);

  const filterByTimeFrame = (issues) => {
    const now = new Date();
    if (timeFrameFilter === "lastWeek") {
      const lastWeek = subWeeks(now, 1);
      return issues.filter((issue) => new Date(issue.createdAt) >= lastWeek);
    } else if (timeFrameFilter === "lastMonth") {
      const lastMonth = subMonths(now, 1);
      return issues.filter((issue) => new Date(issue.createdAt) >= lastMonth);
    }
    return issues;
  };

  const displayedIssues = filterByTimeFrame(
    issues
      .filter((issue) => issue.status === activeTab)
      .filter((issue) => (tagFilter ? issue.labels.includes(tagFilter) : true)),
  );

  const openIssuesCount = issues.filter(
    (issue) => issue.status === "open",
  ).length;
  const closedIssuesCount = issues.filter(
    (issue) => issue.status === "closed",
  ).length;

  if (loading) {
    return <div className="text-center text-textSecondary">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setActiveTab("open")}
              className={`flex items-center gap-2 text-lg font-semibold transition-colors hover:text-textPrimary px-2 py-1 rounded ${
                activeTab === "open"
                  ? "text-textPrimary bg-gray-500"
                  : "text-textSecondary"
              }`}
            >
              <span className="text-red-500">!</span>
              {openIssuesCount} Open
            </button>
            <button
              onClick={() => setActiveTab("closed")}
              className={`flex items-center gap-2 text-lg font-semibold transition-colors hover:text-textPrimary px-2 py-1 rounded ${
                activeTab === "closed"
                  ? "text-textPrimary bg-gray-500"
                  : "text-textSecondary"
              }`}
            >
              <span className="text-green-500">✓</span>
              {closedIssuesCount} Closed
            </button>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full sm:w-[100px] text-white bg-gray-800 border border-gray-600 rounded p-1 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none"
            >
              <option value="" className="text-white bg-gray-800">
                All Authors
              </option>
              {allAuthors.map((author) => (
                <option
                  key={author}
                  value={author}
                  className="text-white bg-gray-800"
                >
                  {author}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full sm:w-[100px] text-white bg-gray-800 border border-gray-600 rounded p-1 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none"
            >
              <option value="" className="text-white bg-gray-800">
                All Labels
              </option>
              {allTags.map((tag) => (
                <option
                  key={tag}
                  value={tag}
                  className="text-white bg-gray-800"
                >
                  {tag}
                </option>
              ))}
            </select>

            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="w-full sm:w-[100px] text-white bg-gray-800 border border-gray-600 rounded p-1 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none"
            >
              <option value="" className="text-white bg-gray-800">
                All Milestones
              </option>
              {allMilestones.map((milestone) => (
                <option
                  key={milestone}
                  value={milestone}
                  className="text-white bg-gray-800"
                >
                  {milestone}
                </option>
              ))}
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="w-full sm:w-[100px] text-white bg-gray-800 border border-gray-600 rounded p-1 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none"
            >
              <option value="newest" className="text-white bg-gray-800">
                Newest
              </option>
              <option value="oldest" className="text-white bg-gray-800">
                Oldest
              </option>
            </select>
            <select
              value={timeFrameFilter}
              onChange={(e) => setTimeFrameFilter(e.target.value)}
              className="w-full sm:w-[100px] text-white bg-gray-800 border border-gray-600 rounded p-1 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none"
            >
              <option value="all" className="text-white bg-gray-800">
                All Time
              </option>
              <option value="lastWeek" className="text-white bg-gray-800">
                Last Week
              </option>
              <option value="lastMonth" className="text-white bg-gray-800">
                Last Month
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {displayedIssues.length === 0 ? (
            <div className="text-center text-textSecondary">
              No issues found.
            </div>
          ) : (
            displayedIssues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-700 bg-card-bg p-4 transition-colors hover:bg-card-bg-hover"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 w-full">
                    <span className="text-xl flex-shrink-0">
                      {issue.status === "open" ? (
                        <span className="text-red-500">!</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-textPrimary font-medium hover:text-blue-400 truncate">
                          {issue.title}
                        </span>
                        <span className="text-textSecondary text-xs flex-shrink-0">
                          #{issue.id}
                        </span>
                      </div>
                      <span className="text-textSecondary text-xs block">
                        Opened {formatDistanceToNow(new Date(issue.createdAt))}{" "}
                        ago by {issue.author}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={label}
                            className={`text-white text-xs px-2 py-1 rounded ${
                              label === "bug"
                                ? "bg-[#EF4444]"
                                : label === "enhancement"
                                  ? "bg-[#8B5CF6]"
                                  : label === "help wanted"
                                    ? "bg-[#10B981]"
                                    : label === "good first issue"
                                      ? "bg-[#F59E0B]"
                                      : label === "more-information-needed"
                                        ? "bg-[#3B82F6]"
                                        : label === "priority-2"
                                          ? "bg-[#3B82F6]"
                                          : label === "priority-3"
                                            ? "bg-[#3B82F6]"
                                            : label === "tech-debt"
                                              ? "bg-[#8B5CF6]"
                                              : "bg-[#6B7280]"
                            }`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {issue.milestone && (
                      <span className="text-textSecondary">📍</span>
                    )}
                    <span className="text-textSecondary text-xs">
                      {issue.comments} 💬
                    </span>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Issues;
