import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getRepoPRs, getRepoBranches, getPRDetails } from "../../utils/api";
import { useRepo } from "../../context/RepoContext";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterListIcon from "@mui/icons-material/FilterList";
import "./PRs.css";
import { handleApiError } from "../../utils/errorHandler";
import PRDetailChatbot from "../PRDetailChatbot/PRDetailChatbot";
import Loader from "../Loader/Loader";
import RateReviewIcon from "@mui/icons-material/RateReview";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const PRs = () => {
  const { repoFullName } = useParams();
  const { selectedRepo } = useRepo();

  const repo = repoFullName ? decodeURIComponent(repoFullName) : selectedRepo;
  const [owner, repoName] = repo ? repo.split("/") : ["", ""];
  const [prs, setPrs] = useState({
    needsYourReview: [],
    waitingForAuthor: [],
    merged: [],
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [showBranchFilter, setShowBranchFilter] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPR, setSelectedPR] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!owner || !repoName) {
        setError("Repository information is missing.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const prResponse = await getRepoPRs(
          owner,
          repoName,
          selectedBranch || null
        );
        setPrs({
          needsYourReview: prResponse.needsYourReview || [],
          waitingForAuthor: prResponse.waitingForAuthor || [],
          merged: prResponse.merged || [],
        });
        if (branches.length === 0) {
          const branchResponse = await getRepoBranches(owner, repoName);
          setBranches([{ name: "All Branches" }, ...(branchResponse || [])]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [owner, repoName, selectedBranch]);

  const toggleRow = (row) => {
    setExpandedRow((prev) => (prev === row ? null : row));
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch === "All Branches" ? "" : branch);
    setShowBranchFilter(false);
  };


  const [isFetchingDetails, setIsFetchingDetails] = useState(false); // Add a loading state

  const handlePRClick = async (pr) => {
      setIsFetchingDetails(true);
      setError(null);
      try {
          // Fetch full PR details including body and diff
          const fullPRData = await getPRDetails(owner, repoName, pr.id);
          setSelectedPR(fullPRData);
          setIsModalOpen(true);
      } catch (err) {
          setError(handleApiError(err));
          console.error("Failed to fetch PR details:", err);
      } finally {
          setIsFetchingDetails(false);
      }
  };

  const PRList = ({ prs, title, rowKey, icon, color }) => {
    const isExpanded = expandedRow === rowKey;

    return (
      <div className="mb-4 pr-w-full mx-auto">
        <div
          className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 bg-[#17181a] hover:bg-[#1e1f22] border-l-4`}
          style={{ borderColor: color }}
          onClick={() => toggleRow(rowKey)}
        >
          <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
            {icon}
            {prs.length} {title}
          </div>
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ExpandLessIcon className="text-textSecondary" fontSize="small" />
            ) : (
              <ExpandMoreIcon className="text-textSecondary" fontSize="small" />
            )}
            <FilterListIcon className="text-textSecondary" fontSize="small" />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 pr-animate-dropdown">
            {prs.length === 0 ? (
              <p className="text-textSecondary pl-4 text-sm font-semibold">
                No pull requests in this category.
              </p>
            ) : (
              <ul className="space-y-2">
                {prs.map((pr) => (
                  <li
                    key={pr.id}
                    className="rounded-lg border border-gray-700 bg-card-bg p-4 transition-colors hover:bg-card-bg-hover cursor-pointer"
                    onClick={() => !isFetchingDetails && handlePRClick(pr)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-sm font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          #{pr.id} {pr.title}
                        </a>
                        <p className="text-textSecondary text-xs mt-1 font-semibold">
                          Created by {pr.author} on{" "}
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </p>
                        {pr.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pr.labels.map((label, index) => (
                              <span
                                key={`${label}-${index}`}
                                className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded font-semibold"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {pr.comments > 0 ? (
                          <a
                            href={`${pr.url}#issuecomment`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline text-xs font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {pr.comments} 💬
                          </a>
                        ) : (
                          <span className="text-textSecondary text-xs font-semibold">
                            {pr.comments} 💬
                          </span>
                        )}
                        {pr.mergedAt && (
                          <p className="text-green-400 text-xs font-semibold">
                            Merged on{" "}
                            {new Date(pr.mergedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-darkBg text-textPrimary">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pr-w-full max-w-3xl mx-auto">
        <div className="relative w-full sm:w-auto flex justify-end">
          <button
            onClick={() => setShowBranchFilter(!showBranchFilter)}
            className="flex items-center gap-2 border border-border text-primary bg-transparent hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-200"
          >
            <FilterListIcon fontSize="small" />
            {selectedBranch || "All Branches"}
            {showBranchFilter ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </button>

          {showBranchFilter && (
            <div className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto rounded-lg shadow-lg z-10 bg-cardBg pr-animate-dropdown">
              <ul className="py-1">
                {branches.map((branch) => (
                  <li
                    key={branch.name}
                    onClick={() => handleBranchSelect(branch.name)}
                    className="px-4 py-2 text-textPrimary hover:bg-[var(--card-bg-hover)] cursor-pointer transition-all duration-200 text-sm font-semibold"
                  >
                    {branch.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {loading && <Loader />}
      {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

      {!loading && !error && (
        <>
          <PRList
            prs={prs.needsYourReview}
            title="Needs your review"
            rowKey="needsYourReview"
            icon={<RateReviewIcon className="text-yellow-400" />}
            color="#facc15" // Tailwind's yellow-400
          />
          <PRList
            prs={prs.waitingForAuthor}
            title="Waiting for author"
            rowKey="waitingForAuthor"
            icon={<HourglassTopIcon className="text-blue-400" />}
            color="#60a5fa" // Tailwind's blue-400
          />
          <PRList
            prs={prs.merged}
            title="Merging and recently merged"
            rowKey="mergingAndMerged"
            icon={<CheckCircleIcon className="text-green-400" />}
            color="#34d399" // Tailwind's green-400
          />
        </>
      )}

      {selectedPR && (
        <PRDetailChatbot
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pr={selectedPR}
        />
      )}
    </div>
  );
};

export default PRs;
