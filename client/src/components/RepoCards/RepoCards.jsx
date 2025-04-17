import { useNavigate } from "react-router-dom";
import { useRepo } from "../../context/RepoContext";
import GitHubIcon from "@mui/icons-material/GitHub";
import StarIcon from "@mui/icons-material/Star";
import ForkRightIcon from "@mui/icons-material/ForkRight";
import "./RepoCards.css";

function RepoCards({ repos }) {
  const navigate = useNavigate();
  const { setSelectedRepo } = useRepo();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleRepositoryNavigation = (repo) => {
    setSelectedRepo(repo.full_name);
    navigate(`/dashboard/${encodeURIComponent(repo.full_name)}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map((repo) => (
        <div
          key={repo.id}
          className="card-bg rounded-md shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          onClick={() => handleRepositoryNavigation(repo)}
        >
          <div className="p-4 pb-2">
            <div className="flex items-start mb-1">
              <div className="flex flex-col">
                <span className="text-textPrimary font-semibold text-sm hover:underline cursor-pointer truncate">
                  {repo.name}
                </span>
                <span className="text-textSecondary text-xs">
                  {repo.owner?.login || "shailendra-jaani"}
                </span>
              </div>
            </div>
            <p className="text-textSecondary text-xs mt-3 mb-2 h-12 overflow-hidden">
              {repo.description || "No description available"}
            </p>
            <div className="mt-6 mb-2">
              <span className="text-xs text-textSecondary flex items-center">
                <span
                  className="w-2 h-2 rounded-full mr-1 inline-block"
                  style={{
                    backgroundColor:
                      repo.language === "JavaScript"
                        ? "var(--javascript-color)"
                        : "#ccc",
                  }}
                ></span>
                JavaScript
              </span>
            </div>
          </div>

          {/* Footer with stats */}
          <div className="flex justify-between items-center px-4 py-2 border-t border-gray-700 bg-opacity-50 text-xs text-textSecondary">
            <div className="flex items-center">
              <StarIcon sx={{ fontSize: 14, marginRight: 0.5 }} />
              <span>{repo.stargazers_count || 0}</span>
            </div>

            <div className="flex items-center ml-4">
              <ForkRightIcon sx={{ fontSize: 14, marginRight: 0.5 }} />
              <span>{repo.forks_count || 0}</span>
            </div>

            <div className="ml-auto">
              <span>Updated {formatDate(repo.updated_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RepoCards;
