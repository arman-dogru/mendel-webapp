import React, { useState, useMemo } from "react";
import {
  Button,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  scanRepository,
  getScanHistory,
  getSpecificScan,
  sendChatMessage,
  getRepoBranches,
} from "../../utils/api";
import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import BugReportIcon from "@mui/icons-material/BugReport";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import BuildIcon from "@mui/icons-material/Build";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import HistoryIcon from "@mui/icons-material/History";
import LaunchIcon from "@mui/icons-material/Launch";
import GitBranchIcon from "@mui/icons-material/AccountTree";
import ExportReportButton from "../ExportReportButton/ExportReportButtonComponent";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const getCategoryIcon = (category) => {
  const iconProps = { fontSize: "small" };
  switch (category) {
    case "Potential Bug":
      return <BugReportIcon {...iconProps} />;
    case "Security Vulnerability":
      return <SecurityIcon {...iconProps} />;
    case "Performance Issue":
      return <SpeedIcon {...iconProps} />;
    case "Code Smell":
      return <BuildIcon {...iconProps} />;
    case "Bad Practice":
      return <ErrorOutlineIcon {...iconProps} />;
    case "Readability":
      return <VisibilityIcon {...iconProps} />;
    case "Dead Code":
      return <DeleteSweepIcon {...iconProps} />;
    default:
      return <CodeIcon {...iconProps} />;
  }
};

const getSeverityProps = (severity) => {
  const iconProps = { fontSize: "small" };
  switch (severity?.toLowerCase()) {
    case "high":
      return { color: "error", icon: <ReportProblemIcon {...iconProps} /> };
    case "medium":
      return { color: "warning", icon: <WarningIcon {...iconProps} /> };
    case "low":
      return { color: "info", icon: <InfoIcon {...iconProps} /> };
    case "informational":
      return { color: "success", icon: <InfoIcon {...iconProps} /> };
    default:
      return { color: "default", icon: <InfoIcon {...iconProps} /> };
  }
};

const CodeAnalysisComponent = ({ repo }) => {
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [branchAnchorEl, setBranchAnchorEl] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchesError, setBranchesError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    category: null,
    severity: null,
  });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [defaultBranch, setDefaultBranch] = useState(null);

  const [owner, repoName] = repo ? repo.split("/") : ["", ""];
  const historyMenuOpen = Boolean(anchorEl);
  const branchMenuOpen = Boolean(branchAnchorEl);

  const handleBranchScan = async (branchName) => {
    setBranchAnchorEl(null);
    if (!branchName) return;
    setSelectedBranch(branchName);
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveFilters({ category: null, severity: null });
    setIsViewingHistory(false);
    try {
      const historyData = await getScanHistory(owner, repoName);
      setScanHistory(historyData.history || []);
      const branchHistory = historyData.history.filter(
        (scan) => scan.branchName === branchName
      );
      if (branchHistory.length > 0) {
        const latestScan = branchHistory.sort(
          (a, b) => new Date(b.scanTimestamp) - new Date(a.scanTimestamp)
        )[0];
        const historicalScanData = await getSpecificScan(latestScan._id);
        setAnalysisResult(historicalScanData);
        setIsViewingHistory(true);
      } else {
        const result = await scanRepository(owner, repoName, branchName);
        setAnalysisResult(result);
        if (!result.isCached) {
          const updatedHistory = await getScanHistory(owner, repoName);
          setScanHistory(updatedHistory.history || []);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to scan repository branch.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!owner || !repoName) return;
    const fetchData = async () => {
      setLoading(true);
      setLoadingHistory(true);
      try {
        const historyData = await getScanHistory(owner, repoName);
        setScanHistory(historyData.history || []);
        setDefaultBranch(historyData.defaultBranch || "master");
        setSelectedBranch(historyData.defaultBranch || "master");

        const defaultBranchHistory = historyData.history.filter(
          (scan) => scan.branchName === historyData.defaultBranch
        );
        if (defaultBranchHistory.length > 0) {
          const latestScan = defaultBranchHistory.sort(
            (a, b) => new Date(b.scanTimestamp) - new Date(a.scanTimestamp)
          )[0];
          try {
            const historicalScanData = await getSpecificScan(latestScan._id);
            setAnalysisResult(historicalScanData);
            setIsViewingHistory(true);
          } catch (err) {
            setError(
              err.message ||
                `Could not load scan details for ID: ${latestScan._id}`
            );
          }
        } else {
          try {
            const result = await scanRepository(
              owner,
              repoName,
              historyData.defaultBranch
            );
            setAnalysisResult(result);
            if (!result.isCached) {
              const updatedHistory = await getScanHistory(owner, repoName);
              setScanHistory(updatedHistory.history || []);
            }
          } catch (err) {
            setError(err.message || "Failed to scan default branch.");
          }
        }
      } catch (err) {
        setHistoryError(err.message || "Could not load scan history.");
      } finally {
        setLoadingHistory(false);
      }

      setLoadingBranches(true);
      try {
        const branchesData = await getRepoBranches(owner, repoName);
        setBranches(branchesData || []);
      } catch (err) {
        setBranchesError(err.message || "Could not load branches.");
      } finally {
        setLoadingBranches(false);
        setLoading(false);
      }
    };
    fetchData();
    setAnalysisResult(null);
    setError(null);
    setIsViewingHistory(false);
    setActiveFilters({ category: null, severity: null });
  }, [owner, repoName]);

  const handleScan = async () => {
    if (!owner || !repoName) {
      setError("Repository information is missing.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveFilters({ category: null, severity: null });
    setIsViewingHistory(false);
    try {
      const branchToScan = selectedBranch || defaultBranch;
      const result = await scanRepository(owner, repoName, branchToScan, true);
      setAnalysisResult(result);
      if (!result.isCached) {
        const historyData = await getScanHistory(owner, repoName);
        setScanHistory(historyData.history || []);
      }
    } catch (err) {
      setError(err.message || "Failed to scan repository.");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleHistoryMenuClose = () => setAnchorEl(null);
  const handleBranchMenuClick = (event) =>
    setBranchAnchorEl(event.currentTarget);
  const handleBranchMenuClose = () => setBranchAnchorEl(null);

  const handleViewHistoryScan = async (scanId) => {
    setAnchorEl(null);
    if (!scanId) return;
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveFilters({ category: null, severity: null });
    try {
      const historicalScanData = await getSpecificScan(scanId);
      setAnalysisResult(historicalScanData);
      setIsViewingHistory(true);
      setSelectedBranch(historicalScanData.summary?.branchName || null);
    } catch (err) {
      setError(err.message || `Could not load scan details for ID: ${scanId}`);
      setIsViewingHistory(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (type, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
  };

  const dashboardData = useMemo(() => {
    if (!analysisResult?.fileAnalyses) return null;
    const counts = {
      byCategory: {},
      bySeverity: {},
      totalIssues: 0,
      filesWithIssues: 0,
    };
    const filesWithIssuesSet = new Set();
    analysisResult.fileAnalyses.forEach((file) => {
      if (
        file.status === "analyzed" &&
        Array.isArray(file.issues) &&
        file.issues.length > 0
      ) {
        filesWithIssuesSet.add(file.filePath);
        file.issues.forEach((issue) => {
          counts.totalIssues++;
          if (issue.category)
            counts.byCategory[issue.category] =
              (counts.byCategory[issue.category] || 0) + 1;
          if (issue.severity) {
            const severity =
              issue.severity.charAt(0).toUpperCase() +
              issue.severity.slice(1).toLowerCase();
            counts.bySeverity[severity] =
              (counts.bySeverity[severity] || 0) + 1;
          }
        });
      }
    });
    counts.filesWithIssues = filesWithIssuesSet.size;
    return counts;
  }, [analysisResult]);

  const filteredIssuesData = useMemo(() => {
    if (!analysisResult?.fileAnalyses) return [];
    const { category: categoryFilter, severity: severityFilter } =
      activeFilters;
    const noFiltersActive = !categoryFilter && !severityFilter;
    return analysisResult.fileAnalyses
      .filter(
        (file) =>
          file.status === "analyzed" &&
          Array.isArray(file.issues) &&
          file.issues.length > 0 &&
          (noFiltersActive ||
            file.issues.some((issue) => {
              const severity =
                issue.severity?.charAt(0).toUpperCase() +
                issue.severity?.slice(1).toLowerCase();
              return (
                (!categoryFilter || issue.category === categoryFilter) &&
                (!severityFilter || severity === severityFilter)
              );
            }))
      )
      .map((file) => ({
        ...file,
        issues: file.issues.filter((issue) => {
          const severity =
            issue.severity?.charAt(0).toUpperCase() +
            issue.severity?.slice(1).toLowerCase();
          return (
            (!categoryFilter || issue.category === categoryFilter) &&
            (!severityFilter || severity === severityFilter)
          );
        }),
      }));
  }, [analysisResult, activeFilters]);

  const renderSummary = () => {
    if (!analysisResult?.summary) return null;
    const {
      filesAnalyzed = 0,
      filesSkipped = 0,
      filesErrored = 0,
      maxFilesAttempted = "N/A",
      commitSha,
      analysisTimestamp,
      defaultBranch: summaryDefaultBranch,
      branchName,
    } = analysisResult.summary;
    const displayTimestamp = analysisResult.scanTimestamp || analysisTimestamp;
    const displayBranch =
      branchName ||
      summaryDefaultBranch ||
      selectedBranch ||
      defaultBranch ||
      "N/A";

    return (
      <Paper
        elevation={2}
        sx={{ p: 2, mb: 3, backgroundColor: "var(--card-bg)" }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ color: "var(--text-primary)" }}>
            Scan Summary
          </Typography>
          {isViewingHistory && (
            <Chip
              icon={<HistoryIcon fontSize="small" />}
              label="Historical Scan"
              size="small"
              sx={{
                color: "var(--text-primary)",
                backgroundColor: "var(--card-bg-hover)",
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
          {commitSha ? `Commit: ${commitSha.substring(0, 7)} | ` : ""}Scanned
          Branch: {displayBranch}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
          Scan Time:{" "}
          {displayTimestamp
            ? new Date(displayTimestamp).toLocaleString()
            : "N/A"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "var(--text-secondary)", mt: 1 }}
        >
          Max Relevant Files Attempted: {maxFilesAttempted}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
          Successfully Analyzed: {filesAnalyzed} | Skipped: {filesSkipped} |
          Errors: {filesErrored}
        </Typography>
        {analysisResult.summary.message && (
          <Typography
            variant="body2"
            sx={{
              color: isViewingHistory ? "var(--text-secondary)" : "#ff5555",
              fontStyle: "italic",
              mt: 1,
            }}
          >
            {analysisResult.summary.message}
          </Typography>
        )}
      </Paper>
    );
  };

  const renderIssueList = () => {
    if (!filteredIssuesData?.length) {
      if (activeFilters.category || activeFilters.severity) {
        return (
          <Typography
            sx={{ textAlign: "center", mt: 4, color: "var(--text-secondary)" }}
          >
            No issues match the current filter
            {activeFilters.category && activeFilters.severity ? "s" : ""}.
            {activeFilters.category && ` (Category: ${activeFilters.category})`}
            {activeFilters.severity && ` (Severity: ${activeFilters.severity})`}
          </Typography>
        );
      }
      if (dashboardData?.totalIssues === 0) return null;
      return null;
    }

    return (
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" sx={{ color: "var(--text-primary)", mb: 2 }}>
          {activeFilters.category || activeFilters.severity
            ? "Filtered Issues"
            : "Identified Issues"}
          {isViewingHistory &&
            analysisResult.summary?.commitSha &&
            ` (from commit ${analysisResult.summary.commitSha.substring(
              0,
              7
            )})`}
        </Typography>
        {filteredIssuesData.map((file) => (
          <Box
            key={file.filePath}
            sx={{
              p: 4,
              mb: 2,
              backgroundColor: "var(--card-bg)",
              borderTop: 1,
              borderColor: "var(--text-secondary)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                pb: 2,
                borderBottom: 1,
                borderColor: "var(--card-bg-hover)",
              }}
            >
              <Typography
                sx={{ color: "var(--text-primary)", fontSize: "1.25rem" }}
                title={file.filePath}
              >
                {file.filePath} ({file.issues.length})
              </Typography>
              {file.githubUrl && (
                <IconButton
                  href={file.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "#ffffff" }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            {file.issues.map((issue, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  mb: 1,
                  border: 1,
                  borderColor: "var(--text-secondary)",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": { borderColor: "var(--text-primary)" },
                }}
                onClick={() =>
                  setSelectedIssue({ file, issue }) || setIsModalOpen(true)
                }
              >
                {getCategoryIcon(issue.category)}
                <Typography
                  sx={{ color: "var(--text-primary)", fontSize: "0.875rem" }}
                >
                  {issue.description}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const IssueDetailModal = ({ open, onClose, issue, file }) => {
    const [comment, setComment] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isBotTyping, setIsBotTyping] = useState(false);

    React.useEffect(() => {
      if (open) {
        setIsBotTyping(false);
        setChatHistory([
          {
            sender: "bot",
            message:
              "Hello! I'm here to help with this issue. What would you like to discuss?",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    }, [open]);

    if (!issue || !file) return null;
    const severityProps = getSeverityProps(issue.severity);

    const handleSendMessage = async () => {
      if (!comment.trim() || isBotTyping) return;
      const userMessage = {
        sender: "user",
        message: comment,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => [...prev, userMessage]);
      setComment("");
      setIsBotTyping(true);
      try {
        const response = await sendChatMessage({
          contextType: "issue",
          contextData: { issue, file },
          chatHistory: [...chatHistory, userMessage],
          userMessage: comment,
        });
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "bot",
            message: response.message,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } catch {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "bot",
            message: "Sorry, I encountered an error. Please try again later.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        setIsBotTyping(false);
      }
    };

    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "var(--card-bg)",
            margin: { xs: 1, sm: 2, md: "0 0 0 auto" },
            width: {
              xs: "calc(100% - 16px)",
              sm: "calc(100% - 32px)",
              md: "50%",
            },
            height: { md: "100%" },
            position: { md: "fixed" },
            right: 0,
            top: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            color: "var(--text-primary)",
            borderBottom: "1px solid var(--card-bg-hover)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {getCategoryIcon(issue.category)}
            <Typography variant="h6">{issue.description}</Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "var(--text-primary)" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: "var(--text-secondary)", mb: 2 }}
          >
            File: {file.filePath}
            {file.githubUrl && (
              <IconButton
                size="small"
                href={file.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  ml: 1,
                  color: "var(--text-secondary)",
                  "&:hover": { color: "var(--text-primary)" },
                }}
              >
                <LaunchIcon fontSize="inherit" />
              </IconButton>
            )}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 4 }}>
            {issue.category && (
              <Chip
                icon={getCategoryIcon(issue.category)}
                label={issue.category}
                size="small"
                sx={{
                  backgroundColor: "var(--button-bg)",
                  color: "#000000",
                  "& .MuiChip-icon": { color: "#000000" },
                }}
              />
            )}
            <Chip
              icon={severityProps.icon}
              label={issue.severity || "Unknown"}
              size="small"
              variant="outlined"
              sx={{
                borderColor: `${severityProps.color}.main`,
                backgroundColor: "var(--button-bg)",
                color: "#000000",
                "& .MuiChip-icon": { color: "#000000" },
              }}
            />
            {issue.line && (
              <Chip
                label={`Line ${issue.line}`}
                size="small"
                sx={{ backgroundColor: "var(--button-bg)", color: "#000000" }}
              />
            )}
          </Stack>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{
                color: "var(--text-secondary)",
                fontWeight: "medium",
                mb: 0.5,
              }}
            >
              Description
            </Typography>
            <Typography sx={{ color: "var(--text-primary)" }}>
              {issue.explanation || "No explanation provided"}
            </Typography>
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{
                color: "var(--text-secondary)",
                fontWeight: "medium",
                mb: 0.5,
              }}
            >
              Suggestion
            </Typography>
            <Typography sx={{ color: "var(--button-bg)" }}>
              {issue.suggestion || "No suggestion provided"}
            </Typography>
          </Box>
          {issue.code_snippet && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "var(--text-secondary)",
                  fontWeight: "medium",
                  mb: 0.5,
                }}
              >
                Code
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: "#2d2d2d",
                  p: 1.5,
                  borderRadius: 1,
                  overflowX: "auto",
                  fontSize: "0.875rem",
                  color: "var(--text-primary)",
                }}
              >
                <code>{issue.code_snippet}</code>
              </Box>
            </Box>
          )}
          <Typography
            variant="body2"
            sx={{
              color: "var(--text-secondary)",
              fontWeight: "medium",
              mb: 1.5,
              borderBottom: "1px solid var(--text-secondary)",
            }}
          >
            Chat with AI
          </Typography>
          {chatHistory.map((msg, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  backgroundColor:
                    msg.sender === "user" ? "var(--button-bg)" : "#3a3a3a",
                  color: msg.sender === "user" ? "#000" : "var(--text-primary)",
                  borderRadius: "12px",
                  p: "8px 12px",
                  maxWidth: "70%",
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.message}
                </ReactMarkdown>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: "var(--text-secondary)",
                  mt: 0.5,
                  fontSize: "0.65rem",
                }}
              >
                {msg.sender === "user" ? "You" : "AI"} • {msg.timestamp}
              </Typography>
            </Box>
          ))}
          {isBotTyping && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  backgroundColor: "#3a3a3a",
                  color: "var(--text-primary)",
                  borderRadius: "12px",
                  p: "8px 12px",
                  maxWidth: "70%",
                }}
              >
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  AI is typing...
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: "var(--card-bg)" }}>
          <TextField
            fullWidth
            placeholder="Chat with AI about this issue..."
            variant="outlined"
            value={comment}
            disabled={isBotTyping}
            onChange={(e) => setComment(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && comment.trim() && handleSendMessage()
            }
            InputProps={{
              sx: {
                backgroundColor: "var(--card-bg-hover)",
                borderRadius: "8px",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "transparent",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--text-secondary)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--button-bg)",
                },
                color: "var(--text-primary)",
              },
              endAdornment: (
                <Button
                  variant="contained"
                  size="small"
                  disabled={!comment.trim() || isBotTyping}
                  onClick={handleSendMessage}
                  sx={{
                    backgroundColor: "var(--button-bg)",
                    color: "#000",
                    "&:hover": { backgroundColor: "var(--button-hover-bg)" },
                  }}
                >
                  {isBotTyping ? "..." : "Send"}
                </Button>
              ),
            }}
          />
        </DialogActions>
      </Dialog>
    );
  };

  const renderDashboard = () => {
    if (!dashboardData || dashboardData.totalIssues === 0) {
      if (analysisResult?.summary?.filesAnalyzed >= 0) {
        return (
          <Paper
            elevation={2}
            sx={{ p: 2, mb: 3, backgroundColor: "var(--card-bg)" }}
          >
            <Typography variant="h6" sx={{ color: "var(--text-primary)" }}>
              Issue Dashboard
            </Typography>
            <Typography sx={{ color: "var(--text-secondary)", mt: 1 }}>
              No issues were identified in this scan.
            </Typography>
          </Paper>
        );
      }
      return null;
    }

    const categories = Object.entries(dashboardData.byCategory).sort(
      ([, a], [, b]) => b - a
    );
    const severities = Object.entries(dashboardData.bySeverity).sort((a, b) => {
      const order = { High: 4, Medium: 3, Low: 2, Informational: 1 };
      return (order[b[0]] || 0) - (order[a[0]] || 0);
    });

    return (
      <Paper
        elevation={2}
        sx={{ p: 2, mb: 3, backgroundColor: "var(--card-bg)" }}
      >
        <Typography variant="h6" sx={{ color: "var(--text-primary)", mb: 2 }}>
          Issue Dashboard
        </Typography>
        <Typography
          sx={{ color: "var(--text-secondary)", mb: 4, fontSize: "0.875rem" }}
        >
          Found {dashboardData.totalIssues} total issues across{" "}
          {dashboardData.filesWithIssues} files. Click categories or severities
          to filter.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography
              sx={{
                color: "var(--text-secondary)",
                fontWeight: "medium",
                mb: 2,
              }}
            >
              By Category
            </Typography>
            {categories.map(([category, count]) => (
              <CardActionArea
                key={category}
                onClick={() => handleFilterClick("category", category)}
                sx={{ mb: 1 }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    backgroundColor:
                      activeFilters.category === category
                        ? "var(--card-bg-hover)"
                        : "var(--card-bg)",
                    borderColor:
                      activeFilters.category === category
                        ? "var(--button-bg)"
                        : "var(--text-secondary)",
                    borderWidth: activeFilters.category === category ? 2 : 1,
                  }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--text-primary)",
                      }}
                    >
                      {getCategoryIcon(category)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {category}
                      </Typography>
                    </Box>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        backgroundColor: "var(--card-bg-hover)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </CardContent>
                </Card>
              </CardActionArea>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography
              sx={{
                color: "var(--text-secondary)",
                fontWeight: "medium",
                mb: 2,
              }}
            >
              By Severity
            </Typography>
            {severities.map(([severity, count]) => {
              const severityProps = getSeverityProps(severity);
              return (
                <CardActionArea
                  key={severity}
                  onClick={() => handleFilterClick("severity", severity)}
                  sx={{ mb: 1 }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      backgroundColor:
                        activeFilters.severity === severity
                          ? "var(--card-bg-hover)"
                          : "var(--card-bg)",
                      borderColor:
                        activeFilters.severity === severity
                          ? `${severityProps.color}.main`
                          : "var(--text-secondary)",
                      borderWidth: activeFilters.severity === severity ? 2 : 1,
                    }}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          color: `${severityProps.color}.main`,
                        }}
                      >
                        {severityProps.icon}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {severity}
                        </Typography>
                      </Box>
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          backgroundColor: `${severityProps.color}.main`,
                          color: `${severityProps.color}.contrastText`,
                        }}
                      />
                    </CardContent>
                  </Card>
                </CardActionArea>
              );
            })}
          </Grid>
        </Grid>
        {(activeFilters.category || activeFilters.severity) && (
          <Box sx={{ mt: 4, display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              sx={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}
            >
              Active filters:
            </Typography>
            {activeFilters.category && (
              <Chip
                icon={getCategoryIcon(activeFilters.category)}
                label={activeFilters.category}
                onDelete={() =>
                  handleFilterClick("category", activeFilters.category)
                }
                sx={{ backgroundColor: "var(--button-bg)", color: "black" }}
              />
            )}
            {activeFilters.severity && (
              <Chip
                icon={getSeverityProps(activeFilters.severity).icon}
                label={activeFilters.severity}
                onDelete={() =>
                  handleFilterClick("severity", activeFilters.severity)
                }
                sx={{ backgroundColor: "var(--button-bg)", color: "black" }}
              />
            )}
            <Button
              onClick={() =>
                setActiveFilters({ category: null, severity: null })
              }
              sx={{
                color: "var(--button-bg)",
                fontSize: "0.875rem",
                textTransform: "none",
              }}
            >
              Clear All
            </Button>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        color: "var(--text-primary)",
        backgroundColor: "var(--dark-bg)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          Codebase Analysis
          {selectedBranch && ` - ${selectedBranch}`}
        </Typography>
        <Button
          variant="outlined"
          disabled={loadingHistory || scanHistory.length === 0}
          onClick={handleHistoryMenuClick}
          startIcon={
            loadingHistory ? <CircularProgress size={20} /> : <HistoryIcon />
          }
          sx={{
            borderColor: "var(--text-secondary)",
            color: "var(--text-primary)",
            "&:hover": {
              borderColor: "var(--text-primary)",
              backgroundColor: "var(--card-bg-hover)",
            },
          }}
        >
          Scan History {scanHistory.length > 0 ? `(${scanHistory.length})` : ""}
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={historyMenuOpen}
          onClose={handleHistoryMenuClose}
          PaperProps={{ style: { maxHeight: 300, width: "35ch" } }}
        >
          {historyError && (
            <MenuItem disabled>
              <Alert severity="error">{historyError}</Alert>
            </MenuItem>
          )}
          {scanHistory.length === 0 && !loadingHistory && !historyError && (
            <MenuItem disabled>No scan history found.</MenuItem>
          )}
          {scanHistory
            .filter(
              (scan) => !selectedBranch || scan.branchName === selectedBranch
            )
            .map((scan) => (
              <MenuItem
                key={scan._id}
                onClick={() => handleViewHistoryScan(scan._id)}
                dense
              >
                <Box>
                  <Typography variant="body2">
                    Commit: {scan.commitSha?.substring(0, 7) || "Unknown"} (
                    {scan.branchName || "N/A"})
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "var(--text-secondary)" }}
                  >
                    {new Date(scan.scanTimestamp).toLocaleString()}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
        </Menu>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Button
          onClick={handleScan}
          disabled={loading || !owner || !repoName}
          sx={{
            backgroundColor: "var(--button-bg)",
            color: "black",
            "&:hover": { backgroundColor: "var(--button-hover-bg)" },
            "&:disabled": { opacity: 0.5 },
          }}
        >
          {loading ? <CircularProgress size={20} /> : "Scan Latest Commit"}
        </Button>
        <Button
          variant="contained"
          disabled={loadingBranches || branches.length === 0}
          onClick={handleBranchMenuClick}
          startIcon={
            loadingBranches ? <CircularProgress size={20} /> : <GitBranchIcon />
          }
          sx={{
            backgroundColor: "var(--button-bg)",
            color: "#000",
            "&:hover": { backgroundColor: "var(--button-hover-bg)" },
          }}
        >
          Scan by Branch {branches.length > 0 ? `(${branches.length})` : ""}
        </Button>
        <Menu
          anchorEl={branchAnchorEl}
          open={branchMenuOpen}
          onClose={handleBranchMenuClose}
          PaperProps={{ style: { maxHeight: 300, width: "35ch" } }}
        >
          {branchesError && (
            <MenuItem disabled>
              <Alert severity="error">{branchesError}</Alert>
            </MenuItem>
          )}
          {branches.length === 0 && !loadingBranches && !branchesError && (
            <MenuItem disabled>No branches found.</MenuItem>
          )}
          {branches.map((branch) => (
            <MenuItem
              key={branch.name}
              onClick={() => handleBranchScan(branch.name)}
              dense
            >
              {branch.name}
              {branch.name === defaultBranch && " (default)"}
            </MenuItem>
          ))}
        </Menu>
        <ExportReportButton
          analysisResult={analysisResult}
          disabled={loading || !analysisResult}
        />
      </Box>
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: "var(--card-bg)",
            color: "var(--text-primary)",
            "& .MuiAlert-icon": { color: "var(--text-primary)" },
          }}
        >
          {error}
        </Alert>
      )}
      {analysisResult && (
        <>
          {renderSummary()}
          {renderDashboard()}
          {renderIssueList()}
          {selectedIssue && (
            <IssueDetailModal
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              issue={selectedIssue.issue}
              file={selectedIssue.file}
            />
          )}
        </>
      )}
      {loading && !analysisResult && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      )}
      {analysisResult?.fileAnalyses?.filter(
        (f) => f.status === "error" || f.status === "skipped"
      ).length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h6"
            sx={{ color: "var(--text-secondary)", mb: 2 }}
          >
            Files Not Fully Analyzed
          </Typography>
          {analysisResult.fileAnalyses
            .filter((f) => f.status === "error" || f.status === "skipped")
            .map((file) => (
              <Paper
                key={file.filePath}
                elevation={1}
                sx={{ p: 1.5, mb: 1, backgroundColor: "var(--card-bg)" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    icon={
                      file.status === "error" ? (
                        <ErrorOutlineIcon />
                      ) : (
                        <WarningIcon />
                      )
                    }
                    label={file.status.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{
                      mr: 1,
                      borderColor: "var(--text-secondary)",
                      color: "var(--text-primary)",
                      backgroundColor: "var(--text-gray)",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "var(--text-primary)",
                      mr: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {file.filePath}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "var(--text-secondary)",
                    display: "block",
                    mt: 0.5,
                  }}
                >
                  Reason:{" "}
                  {file.error_message ||
                    file.skip_reason ||
                    "No specific reason provided."}
                </Typography>
                {file.rawOutput && (
                  <Box
                    component="pre"
                    sx={{
                      backgroundColor: "#2d2d2d",
                      p: 1,
                      borderRadius: 1,
                      overflowX: "auto",
                      mt: 1,
                      fontSize: "0.75rem",
                      color: "var(--text-primary)",
                      maxHeight: "100px",
                    }}
                  >
                    <code>
                      {typeof file.rawOutput === "string"
                        ? file.rawOutput
                        : JSON.stringify(file.rawOutput)}
                    </code>
                  </Box>
                )}
              </Paper>
            ))}
        </Box>
      )}
    </Box>
  );
};

export default CodeAnalysisComponent;
