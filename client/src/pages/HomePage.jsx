import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RepoCards from "../components/RepoCards/RepoCards";
import { getUserRepos, checkAuthStatus } from "../utils/api";
import HomePageNavbar from "../components/HomePageNavbar/HomePageNavbar";
import { handleApiError } from "../utils/errorHandler";

function HomePage() {
  const [repos, setRepos] = useState([]);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFetchRepos = async () => {
      try {
        setLoading(true);
        const authenticated = await checkAuthStatus();
        if (!authenticated.isAuthenticated) {
          navigate("/");
          return;
        }
        setIsAuthenticated(true);

        const data = await getUserRepos();
        setRepos(data);
        setFilteredRepos(data);
        setLoading(false);
      } catch (err) {
        console.error("Error in checkAuthAndFetchRepos:", err);
        setError(handleApiError(err));
        setLoading(false);
      }
    };

    checkAuthAndFetchRepos();
  }, [navigate]);

  useEffect(() => {
    const filtered = repos.filter((repo) =>
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRepos(filtered);
  }, [searchQuery, repos]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-darkBg flex justify-center items-center">
        <div className="text-textSecondary text-sm">
          Checking authentication...
        </div>
      </div>
    );
  }

  return (
    <>
      <HomePageNavbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-3 bg-darkBg text-textPrimary">
        <h2 className="text-xl sm:text-lg font-bold mb-3 text-sm">
          Your Repositories
        </h2>
        <div className="relative max-w-md w-full mb-6">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="text-textSecondary" />
          </span>
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md bg-accent border border-border text-textPrimary placeholder-textSecondary font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {loading && (
          <div className="text-center text-textSecondary text-sm">
            Loading...
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && filteredRepos.length > 0 && (
          <RepoCards repos={filteredRepos} />
        )}
        {!loading && !error && filteredRepos.length === 0 && (
          <div className="text-center text-textSecondary text-sm">
            No repositories found.
          </div>
        )}
      </div>
    </>
  );
}

export default HomePage;
