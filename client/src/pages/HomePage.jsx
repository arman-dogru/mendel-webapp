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
        <div className="text-textSecondary">Checking authentication...</div>
      </div>
    );
  }

  return (
    <>
      <HomePageNavbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-3 bg-darkBg text-textPrimary">
        <h2 className="text-xl sm:text-lg font-bold mb-3">Your Repositories</h2>
        <div className="mb-4">
          <TextField
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "400px",
              "& .MuiOutlinedInput-root": {
                color: "#e0e0e0",
                "& fieldset": { borderColor: "#4a4a4a" },
                "&:hover fieldset": { borderColor: "#6a6a6a" },
                "&.Mui-focused fieldset": { borderColor: "#ff5555" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#a0a0a0",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#a0a0a0" }} />
                </InputAdornment>
              ),
            }}
          />
        </div>
        {loading && (
          <div className="text-center text-textSecondary">Loading...</div>
        )}
        {error && <div className="text-center text-red-500">{error}</div>}
        {!loading && !error && filteredRepos.length > 0 && (
          <RepoCards repos={filteredRepos} />
        )}
        {!loading && !error && filteredRepos.length === 0 && (
          <div className="text-center text-textSecondary">
            No repositories found.
          </div>
        )}
      </div>
    </>
  );
}

export default HomePage;
