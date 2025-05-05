import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import { getAllUserRepos, saveUserRepoPermissions } from "../../utils/api";
import { useNavigate } from "react-router-dom";

function RepoPermissionModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      const fetchRepos = async () => {
        try {
          setLoading(true);
          const repoData = await getAllUserRepos();
          setRepos(repoData);

          // Initialize all repos as selected by default
          const initialSelectedState = {};
          repoData.forEach((repo) => {
            initialSelectedState[repo.id] = true;
          });
          setSelectedRepos(initialSelectedState);

          setLoading(false);
        } catch (err) {
          setError("Failed to load repositories. Please try again.");
          setLoading(false);
        }
      };

      fetchRepos();
    }
  }, [open]);

  const handleToggleAll = (event) => {
    const isChecked = event.target.checked;
    const newSelectedRepos = {};

    repos.forEach((repo) => {
      newSelectedRepos[repo.id] = isChecked;
    });

    setSelectedRepos(newSelectedRepos);
  };

  const handleToggleRepo = (repoId) => {
    setSelectedRepos((prev) => ({
      ...prev,
      [repoId]: !prev[repoId],
    }));
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);

      // Get array of selected repo full_names
      const selectedReposList = repos
        .filter((repo) => selectedRepos[repo.id])
        .map((repo) => repo.full_name);

      // Save permissions to backend
      await saveUserRepoPermissions(selectedReposList);

      // Close modal and navigate to homepage
      onClose();
      navigate("/homepage");
    } catch (err) {
      setError("Failed to save permissions. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if all repos are selected
  const areAllSelected =
    repos.length > 0 && repos.every((repo) => selectedRepos[repo.id]);

  // Count selected repos
  const selectedCount = Object.values(selectedRepos).filter(Boolean).length;

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#1e1e1e",
          color: "#e0e0e0",
          borderRadius: "12px",
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: "1px solid #333" }}>
        <Typography variant="h6">Select Repositories to Access</Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress size={40} sx={{ color: "#ff5555" }} />
          </Box>
        ) : error ? (
          <Typography color="error" textAlign="center" py={4}>
            {error}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: "#a0a0a0" }}>
              Please select which repositories you want this application to
              access. We'll only display and analyze the repositories you
              select.
            </Typography>

            <Box
              mb={2}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={areAllSelected}
                    onChange={handleToggleAll}
                    sx={{
                      color: "#a0a0a0",
                      "&.Mui-checked": { color: "#ff5555" },
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    Select All Repositories ({repos.length})
                  </Typography>
                }
              />
              <Typography variant="body2" sx={{ color: "#a0a0a0" }}>
                {selectedCount} of {repos.length} selected
              </Typography>
            </Box>

            <Divider sx={{ bgcolor: "#333", my: 1 }} />

            <Box sx={{ maxHeight: "400px", overflow: "auto", pr: 1 }}>
              <FormGroup>
                {repos.map((repo) => (
                  <Box
                    key={repo.id}
                    sx={{
                      py: 1,
                      borderBottom: "1px solid #333",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!selectedRepos[repo.id]}
                          onChange={() => handleToggleRepo(repo.id)}
                          sx={{
                            color: "#a0a0a0",
                            "&.Mui-checked": { color: "#ff5555" },
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">{repo.name}</Typography>
                          <Typography variant="body2" sx={{ color: "#a0a0a0" }}>
                            {repo.owner?.login}/{repo.name}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                ))}
              </FormGroup>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: "1px solid #333", p: 2 }}>
        <Button
          onClick={handleSave}
          disabled={loading || submitting || selectedCount === 0}
          variant="contained"
          sx={{
            backgroundColor: "#ff5555",
            "&:hover": { backgroundColor: "#ff3333" },
            "&.Mui-disabled": { backgroundColor: "#555" },
          }}
        >
          {submitting ? (
            <>
              Saving{" "}
              <CircularProgress size={16} sx={{ ml: 1, color: "#fff" }} />
            </>
          ) : (
            `Continue with ${selectedCount} ${
              selectedCount === 1 ? "Repository" : "Repositories"
            }`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RepoPermissionModal;
