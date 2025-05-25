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
  const [timeFrameFilter, setTimeFrameFilter] = useState("all");

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
              (issue) => issue.milestone === milestoneFilter
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
      .filter((issue) => (tagFilter ? issue.labels.includes(tagFilter) : true))
  );

  const openIssuesCount = issues.filter(
    (issue) => issue.status === "open"
  ).length;
  const closedIssuesCount = issues.filter(
    (issue) => issue.status === "closed"
  ).length;

  if (loading) {
    return (
      <div className="text-center text-secondary font-semibold">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 font-semibold">{error}</div>
    );
  }

  return (
    <div className="min-h-screen dark-bg p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setActiveTab("open")}
              className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-100 hover:[&_svg]:opacity-90 cursor-pointer bg-[var(--button-bg)] text-primary-foreground shadow-sm   h-9 px-4 py-2 border border-[var(--border)] ${
                activeTab === "open"
                  ? "bg-[var(--button-bg)]"
                  : "bg-[var(--card-bg)] text-secondary hover:bg-[var(--card-bg-hover)]"
              }`}
            >
              <span className="text-red-500">!</span>
              {openIssuesCount} Open
            </button>
            <button
              onClick={() => setActiveTab("closed")}
              className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-100 hover:[&_svg]:opacity-90 cursor-pointer bg-[var(--button-bg)] text-primary-foreground shadow-sm   h-9 px-4 py-2 border border-[var(--border)] ${
                activeTab === "closed"
                  ? "bg-[var(--button-bg)]"
                  : "bg-[var(--card-bg)] text-secondary hover:bg-[var(--card-bg-hover)]"
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
              className="w-full sm:w-32 bg-[var(--card-bg)] text-primary border border-[var(--border)] rounded-md p-1.5 text-sm font-semibold   focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option
                value=""
                className="bg-[var(--card-bg)] text-primary font-semibold"
              >
                All Authors
              </option>
              {allAuthors.map((author) => (
                <option
                  key={author}
                  value={author}
                  className="bg-[var(--card-bg)] text-primary font-semibold  "
                >
                  {author}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full sm:w-32 bg-[var(--card-bg)] text-primary border border-[var(--border)] rounded-md p-1.5 text-sm font-semibold   focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option
                value=""
                className="bg-[var(--card-bg)] text-primary font-semibold"
              >
                All Labels
              </option>
              {allTags.map((tag) => (
                <option
                  key={tag}
                  value={tag}
                  className="bg-[var(--card-bg)] text-primary font-semibold  "
                >
                  {tag}
                </option>
              ))}
            </select>

            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="w-full sm:w-32 bg-[var(--card-bg)] text-primary border border-[var(--border)] rounded-md p-1.5 text-sm font-semibold   focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option
                value=""
                className="bg-[var(--card-bg)] text-primary font-semibold"
              >
                All Milestones
              </option>
              {allMilestones.map((milestone) => (
                <option
                  key={milestone}
                  value={milestone}
                  className="bg-[var(--card-bg)] text-primary font-semibold  "
                >
                  {milestone}
                </option>
              ))}
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="w-full sm:w-32 bg-[var(--card-bg)] text-primary border border-[var(--border)] rounded-md p-1.5 text-sm font-semibold   focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option
                value="newest"
                className="bg-[var(--card-bg)] text-primary font-semibold  "
              >
                Newest
              </option>
              <option
                value="oldest"
                className="bg-[var(--card-bg)] text-primary font-semibold  "
              >
                Oldest
              </option>
            </select>

            <select
              value={timeFrameFilter}
              onChange={(e) => setTimeFrameFilter(e.target.value)}
              className="w-full sm:w-32 bg-[var(--card-bg)] text-primary border border-[var(--border)] rounded-md p-1.5 text-sm font-semibold   focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option
                value="all"
                className="bg-[var(--card-bg)] text-primary font-semibold  "
              >
                All Time
              </option>
              <option
                value="lastWeek"
                className="bg-[var(--card-bg)] text-primary font-semibold  "
              >
                Last Week
              </option>
              <option
                value="lastMonth"
                className="bg-[var(--card-bg)] text-primary font-semibold  "
              >
                Last Month
              </option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {displayedIssues.length === 0 ? (
            <div className="text-center text-secondary font-semibold">
              No issues found.
            </div>
          ) : (
            displayedIssues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:bg-[var(--card-bg-hover)] transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 w-full">
                    <span className="text-xl font-semibold flex-shrink-0">
                      {issue.status === "open" ? (
                        <span className="text-red-500">!</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-primary font-semibold truncate">
                          {issue.title}
                        </span>
                        <span className="text-secondary text-xs font-semibold flex-shrink-0">
                          #{issue.id}
                        </span>
                      </div>
                      <span className="text-secondary text-xs font-semibold block">
                        Opened {formatDistanceToNow(new Date(issue.createdAt))}{" "}
                        ago by {issue.author}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={label}
                            className={`text-primary-foreground text-xs font-semibold px-2 py-1 rounded ${
                              label === "bug"
                                ? "bg-red-500"
                                : label === "enhancement"
                                ? "bg-purple-500"
                                : label === "help wanted"
                                ? "bg-green-500"
                                : label === "good first issue"
                                ? "bg-yellow-500"
                                : label === "more-information-needed" ||
                                  label === "priority-2" ||
                                  label === "priority-3"
                                ? "bg-blue-500"
                                : label === "tech-debt"
                                ? "bg-purple-500"
                                : "bg-gray-500"
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
                      <span className="text-secondary font-semibold">📍</span>
                    )}
                    <span className="text-secondary text-xs font-semibold">
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
