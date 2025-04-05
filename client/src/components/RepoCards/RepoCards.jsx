import { Button } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarIcon from "@mui/icons-material/Star";
import ForkRightIcon from "@mui/icons-material/ForkRight";
import "./RepoCards.css";
import { useNavigate } from "react-router-dom";
import { useRepo } from "../../context/RepoContext";

function RepoCards({ repos }) {
  const navigate = useNavigate();
  const { setSelectedRepo } = useRepo();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleRepositoryNavigation = (repo) => {
    setSelectedRepo(repo.full_name);
    navigate(`/dashboard/${encodeURIComponent(repo.full_name)}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map((repo) => (
        <div key={repo.id} className="p-4 sm:p-3 card-bg rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg sm:text-base font-semibold text-primary hover:underline truncate"
              title={repo.full_name}
            >
              {repo.full_name}
            </a>
          </div>
          <p className="text-secondary text-sm sm:text-xs mb-3 line-clamp-2">
            {repo.description || "No description available"}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-1 text-sm sm:text-xs text-secondary mb-3">
            <span>
              {repo.visibility || (repo.private ? "private" : "public")}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 sm:w-2 sm:h-2 rounded-full inline-block"
                style={{
                  backgroundColor:
                    repo.language === "JavaScript"
                      ? "var(--javascript-color)"
                      : "#ccc",
                }}
              ></span>
              {repo.language || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <StarIcon
                sx={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
              />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <ForkRightIcon
                sx={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
              />
              {repo.forks_count}
            </span>
          </div>
          <p className="text-secondary text-sm sm:text-xs mb-3">
            Updated {formatDate(repo.updated_at)}
          </p>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleRepositoryNavigation(repo)}
            sx={{
              backgroundColor: "var(--button-bg)",
              color: "var(--text-primary)",
              textTransform: "none",
              fontSize: "0.75rem",
              padding: "4px 8px",
              "&:hover": { backgroundColor: "var(--button-hover-bg)" },
            }}
          >
            Select Repository
          </Button>
        </div>
      ))}
    </div>
  );
}

export default RepoCards;
