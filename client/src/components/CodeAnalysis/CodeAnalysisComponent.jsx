import React, { useState, useMemo, useEffect } from "react";
import {
  Button,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Typography,
  Link,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Menu,
  MenuItem,
  Stack, // <-- Import Stack
} from "@mui/material";
import {
  scanRepository,
  getScanHistory,
  getSpecificScan,
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
import CachedIcon from "@mui/icons-material/Cached";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LaunchIcon from "@mui/icons-material/Launch";

const getCategoryIcon = (category) => {
  const iconProps = {
    fontSize: "small",
    className: category === "Readability" ? "text-white" : "",
  };
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
  // Remove sx={{ mr: 1 }} - let Stack handle spacing
  const iconBaseProps = {
    fontSize: "small",
    sx: {
      /* Removed mr */
    },
  };
  switch (severity?.toLowerCase()) {
    case "high":
      return { color: "error", icon: <ReportProblemIcon {...iconBaseProps} /> };
    case "medium":
      return { color: "warning", icon: <WarningIcon {...iconBaseProps} /> };
    case "low":
      return { color: "info", icon: <InfoIcon {...iconBaseProps} /> };
    case "informational":
      return { color: "success", icon: <InfoIcon {...iconBaseProps} /> }; // Use success for informational
    default:
      return { color: "default", icon: <InfoIcon {...iconBaseProps} /> }; // Default/Unknown
  }
};

const CodeAnalysisComponent = ({ repo }) => {
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState({
    type: "all",
    value: null,
  });
  const [expandedIssues, setExpandedIssues] = useState({});
  const [scanHistory, setScanHistory] = useState([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const historyMenuOpen = Boolean(anchorEl);
  const [activeFilters, setActiveFilters] = useState({
    category: null,
    severity: null,
  });

  const [owner, repoName] = useMemo(() => {
    return repo ? repo.split("/") : ["", ""];
  }, [repo]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!owner || !repoName) return;
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const historyData = await getScanHistory(owner, repoName);
        setScanHistory(historyData || []);
      } catch (err) {
        console.error("Failed to fetch scan history:", err);
        setHistoryError(err.message || "Could not load scan history.");
        setScanHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
    setAnalysisResult(null);
    setError(null);
    setIsViewingHistory(false);
    setSelectedFilter({ type: "all", value: null });
    setExpandedIssues({});
  }, [owner, repoName]);

  const handleScan = async () => {
    if (!owner || !repoName) {
      setError("Repository information is missing.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setSelectedFilter({ type: "all", value: null });
    setExpandedIssues({});
    setIsViewingHistory(false);
    try {
      const result = await scanRepository(owner, repoName);
      setAnalysisResult(result);
      if (!result.isCached) {
        const historyData = await getScanHistory(owner, repoName);
        setScanHistory(historyData || []);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setError(
        err.message || "Failed to scan repository. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleHistoryMenuClose = () => setAnchorEl(null);

  const handleViewHistoryScan = async (scanId) => {
    handleHistoryMenuClose();
    if (!scanId) return;
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setSelectedFilter({ type: "all", value: null });
    setExpandedIssues({});
    try {
      const historicalScanData = await getSpecificScan(scanId);
      setAnalysisResult(historicalScanData);
      setIsViewingHistory(true);
    } catch (err) {
      console.error("Failed to fetch specific scan:", err);
      setError(err.message || `Could not load scan details for ID: ${scanId}`);
      setIsViewingHistory(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (type, value) => {
    setActiveFilters((prev) => {
      if (prev[type] === value) {
        return { ...prev, [type]: null };
      } else {
        return { ...prev, [type]: value };
      }
    });
    setExpandedIssues({});
  };

  const toggleExpandFile = (filePath) => {
    setExpandedIssues((prev) => ({ ...prev, [filePath]: !prev[filePath] }));
  };

  const dashboardData = useMemo(() => {
    if (!analysisResult?.fileAnalyses) return null;

    const counts = {
      byCategory: {},
      bySeverity: {},
      totalIssues: 0,
      filesWithIssues: 0,
    };

    let calculatedTotalIssues = 0;
    const filesWithIssuesSet = new Set();

    analysisResult.fileAnalyses.forEach((file) => {
      if (
        file.status === "analyzed" &&
        Array.isArray(file.issues) &&
        file.issues.length > 0
      ) {
        filesWithIssuesSet.add(file.filePath);
        file.issues.forEach((issue) => {
          calculatedTotalIssues++;
          if (issue.category) {
            counts.byCategory[issue.category] =
              (counts.byCategory[issue.category] || 0) + 1;
          }
          if (issue.severity) {
            const standardizedSeverity =
              issue.severity.charAt(0).toUpperCase() +
              issue.severity.slice(1).toLowerCase();
            counts.bySeverity[standardizedSeverity] =
              (counts.bySeverity[standardizedSeverity] || 0) + 1;
          }
        });
      }
    });

    counts.totalIssues = calculatedTotalIssues;
    counts.filesWithIssues = filesWithIssuesSet.size;

    return counts;
  }, [analysisResult]);

  const filteredIssuesData = useMemo(() => {
    if (!analysisResult?.fileAnalyses) return [];

    const filesWithFilteredIssues = [];
    const { category: categoryFilter, severity: severityFilter } =
      activeFilters;

    const noFiltersActive = !categoryFilter && !severityFilter;

    analysisResult.fileAnalyses.forEach((file) => {
      if (
        file.status !== "analyzed" ||
        !Array.isArray(file.issues) ||
        file.issues.length === 0
      ) {
        return;
      }

      const relevantIssues = file.issues.filter((issue) => {
        if (noFiltersActive) return true;
        const standardizedSeverity =
          issue.severity?.charAt(0).toUpperCase() +
          issue.severity?.slice(1).toLowerCase();
        if (categoryFilter && !severityFilter) {
          return issue.category === categoryFilter;
        }
        if (severityFilter && !categoryFilter) {
          return standardizedSeverity === severityFilter;
        }
        return (
          issue.category === categoryFilter &&
          standardizedSeverity === severityFilter
        );
      });

      if (relevantIssues.length > 0) {
        filesWithFilteredIssues.push({ ...file, issues: relevantIssues });
      }
    });

    return filesWithFilteredIssues;
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
      defaultBranch,
      branchName,
    } = analysisResult.summary;
    const displayTimestamp = analysisResult.scanTimestamp || analysisTimestamp;
    const displayBranch = defaultBranch || branchName || "N/A";

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
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: "var(--text-primary)" }}
          >
            Scan Summary
          </Typography>
          <Box>
            {isViewingHistory && (
              <Chip
                icon={<HistoryIcon fontSize="small" />}
                label="Historical Scan"
                size="small"
                sx={{
                  ml: 1,
                  backgroundColor: "var(--card-bg-hover)",
                  color: "var(--text-primary)",
                }}
              />
            )}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)" }}>
          {commitSha ? `Commit: ${commitSha.substring(0, 7)} | ` : ""} Scanned
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
              color:
                analysisResult.isCached || isViewingHistory
                  ? "var(--text-secondary)"
                  : "#ff5555",
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
    if (
      !analysisResult ||
      !filteredIssuesData ||
      filteredIssuesData.length === 0
    ) {
      if (activeFilters.category || activeFilters.severity) {
        return (
          <Typography
            sx={{ color: "var(--text-secondary)", mt: 2, textAlign: "center" }}
          >
            No issues match the current filter
            {activeFilters.category && activeFilters.severity ? "s" : ""}.
            {activeFilters.category && ` (Category: ${activeFilters.category})`}
            {activeFilters.severity && ` (Severity: ${activeFilters.severity})`}
          </Typography>
        );
      }

      if (!dashboardData || dashboardData.totalIssues === 0) {
        return null;
      }

      return null;
    }

    return (
      <Box sx={{ mt: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: "var(--text-primary)" }}
        >
          {!activeFilters.category && !activeFilters.severity
            ? "Identified Issues"
            : "Filtered Issues"}
          {(analysisResult.isCached || isViewingHistory) &&
            analysisResult.summary?.commitSha &&
            ` (from commit ${analysisResult.summary.commitSha.substring(
              0,
              7
            )})`}
        </Typography>
        {filteredIssuesData.map((file) => (
          <Paper
            key={file.filePath}
            elevation={2}
            sx={{
              p: 0,
              mb: 2,
              backgroundColor: "var(--card-bg)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1.5,
                borderBottom: expandedIssues[file.filePath]
                  ? "1px solid"
                  : "none",
                borderColor: "var(--text-secondary)",
                cursor: "pointer",
                "&:hover": { backgroundColor: "var(--card-bg-hover)" },
              }}
              onClick={() => toggleExpandFile(file.filePath)}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <IconButton
                  size="small"
                  sx={{ mr: 0.5, color: "var(--text-primary)" }}
                >
                  {expandedIssues[file.filePath] ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
                <Typography
                  variant="body1"
                  component="span"
                  sx={{
                    fontWeight: "medium",
                    color: "var(--text-primary)",
                    mr: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={file.filePath}
                >
                  {file.filePath}
                </Typography>
                <Chip
                  label={file.issues.length}
                  size="small"
                  sx={{
                    mr: 1,
                    backgroundColor: "var(--card-bg-hover)",
                    color: "var(--text-primary)",
                    flexShrink: 0,
                  }}
                />
              </Box>
              <Box
                sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <Box sx={{ display: "flex", mr: 1 }}>
                  {Array.from(
                    new Set(file.issues.map((issue) => issue.category))
                  )
                    .slice(0, 3)
                    .map((category, idx) => (
                      <Tooltip key={idx} title={category}>
                        <Box sx={{ mr: 0.5 }}>{getCategoryIcon(category)}</Box>
                      </Tooltip>
                    ))}
                  {file.issues.length > 3 && (
                    <Tooltip title="Multiple issue types">
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "var(--text-secondary)" }}
                        >
                          +
                          {Array.from(
                            new Set(file.issues.map((issue) => issue.category))
                          ).length - 3}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
                {file.githubUrl && (
                  <Tooltip title="Open file on GitHub">
                    <IconButton
                      size="small"
                      href={file.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        color: "var(--text-secondary)",
                        "&:hover": { color: "var(--text-primary)" },
                      }}
                    >
                      <LaunchIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            <Collapse
              in={expandedIssues[file.filePath]}
              timeout="auto"
              unmountOnExit
            >
              <Box
                sx={{
                  p: 2,
                  borderTop: "1px solid",
                  borderColor: "var(--text-secondary)",
                  backgroundColor: "var(--card-bg)",
                }}
              >
                {file.issues.map((issue, index) => {
                  const severityProps = getSeverityProps(issue.severity);
                  return (
                    <Box
                      key={index}
                      sx={{
                        mb: index < file.issues.length - 1 ? 2 : 0,
                        pb: index < file.issues.length - 1 ? 2 : 0,
                        borderBottom:
                          index < file.issues.length - 1
                            ? "1px dashed"
                            : "none",
                        borderColor: "var(--text-secondary)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 0.5,
                          flexWrap: "wrap",
                          gap: 0.5,
                        }}
                      >
                        <Tooltip
                          title={`Severity: ${issue.severity || "Unknown"}`}
                        >
                          <Chip
                            icon={severityProps.icon}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: "medium",
                              minWidth: "auto",
                              "& .MuiChip-icon": {
                                marginLeft: "5px",
                                marginRight: "-6px",
                                color: `${severityProps.color}.main`,
                              },
                              borderColor: `${severityProps.color}.main`,
                              color: `${severityProps.color}.main`,
                              backgroundColor: "var(--card-bg)",
                            }}
                          />
                        </Tooltip>
                        {issue.category && (
                          <Tooltip title={`Category: ${issue.category}`}>
                            <Chip
                              icon={getCategoryIcon(issue.category)}
                              size="small"
                              variant="filled"
                              sx={{
                                minWidth: "auto",
                                "& .MuiChip-icon": {
                                  marginLeft: "5px",
                                  marginRight: "-6px",
                                  color: "var(--text-primary)",
                                },
                                backgroundColor: "var(--card-bg-hover)",
                                color: "var(--text-primary)",
                              }}
                            />
                          </Tooltip>
                        )}
                        {issue.line && (
                          <Tooltip title={`Line: ${issue.line}`}>
                            <Chip
                              label={`L${issue.line}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                minWidth: "auto",
                                height: "20px",
                                fontSize: "0.75rem",
                                borderColor: "var(--text-secondary)",
                                color: "var(--text-primary)",
                                backgroundColor: "var(--card-bg)",
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: "medium",
                          color: "var(--text-primary)",
                          mb: 0.5,
                        }}
                      >
                        {issue.description}
                      </Typography>
                      {issue.explanation && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "var(--text-secondary)",
                            mb: 1,
                          }}
                        >
                          <strong>Explanation:</strong> {issue.explanation}
                        </Typography>
                      )}
                      {issue.suggestion && (
                        <Typography
                          variant="body2"
                          sx={{ color: "#ff5555", mb: 1 }}
                        >
                          <strong>Suggestion:</strong> {issue.suggestion}
                        </Typography>
                      )}
                      {issue.code_snippet && (
                        <Box
                          component="pre"
                          sx={{
                            backgroundColor: "#2d2d2d",
                            p: 1.5,
                            borderRadius: 1,
                            overflowX: "auto",
                            my: 1,
                            fontSize: "0.875rem",
                            color: "var(--text-primary)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          <code>{issue.code_snippet}</code>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Paper>
        ))}
      </Box>
    );
  };

  const renderDashboard = () => {
    if (!dashboardData) {
      if (
        analysisResult &&
        analysisResult?.summary?.filesAnalyzed >= 0 &&
        (!dashboardData || dashboardData?.totalIssues === 0)
      ) {
        return (
          <Paper
            elevation={2}
            sx={{ p: 2, mb: 3, backgroundColor: "var(--card-bg)" }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "var(--text-primary)" }}
            >
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
    if (dashboardData.totalIssues === 0) {
      return (
        <Paper
          elevation={2}
          sx={{ p: 2, mb: 3, backgroundColor: "var(--card-bg)" }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: "var(--text-primary)" }}
          >
            Issue Dashboard
          </Typography>
          <Typography sx={{ color: "var(--text-secondary)", mt: 1 }}>
            No issues were identified in this scan.
          </Typography>
        </Paper>
      );
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
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: "var(--text-primary)" }}
        >
          Issue Dashboard
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "var(--text-secondary)", mb: 2 }}
        >
          Found {dashboardData.totalIssues} total issues across{" "}
          {dashboardData.filesWithIssues} files. Click categories and/or
          severities to filter the list.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle1"
              sx={{ color: "var(--text-secondary)", mb: 1 }}
            >
              By Category
            </Typography>
            {categories.map(([category, count]) => (
              <CardActionArea
                key={category}
                onClick={() => handleFilterClick("category", category)}
                sx={{ mb: 1, borderRadius: 1 }}
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
                      "&:last-child": { pb: 1.5 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Box sx={{ display: "flex", mr: 1 }}>
                        {getCategoryIcon(category)}
                      </Box>
                      <Typography variant="body2">{category}</Typography>
                    </Box>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        fontWeight: "bold",
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
              variant="subtitle1"
              sx={{ color: "var(--text-secondary)", mb: 1 }}
            >
              By Severity
            </Typography>
            {severities.map(([severity, count]) => {
              const severityProps = getSeverityProps(severity);
              return (
                <CardActionArea
                  key={severity}
                  onClick={() => handleFilterClick("severity", severity)}
                  sx={{ mb: 1, borderRadius: 1 }}
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
                        "&:last-child": { pb: 1.5 },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          color: `${severityProps.color}.main`,
                        }}
                      >
                        <Box sx={{ display: "flex", mr: 1 }}>
                          {severityProps.icon}
                        </Box>
                        <Typography variant="body2" sx={{ color: "inherit" }}>
                          {severity}
                        </Typography>
                      </Box>
                      <Chip
                        label={count}
                        size="small"
                        variant="filled"
                        sx={{
                          fontWeight: "bold",
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
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-400">Active filters:</span>
            <div className="flex flex-wrap items-center gap-3">
              {activeFilters.category && (
                <div
                  className="flex items-center rounded-full px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: "#ff7770" }}
                >
                  <span className="mr-2 flex items-center">
                    <span className="flex h-5 w-5 items-center justify-center text-white">
                      {getCategoryIcon(activeFilters.category)}
                    </span>
                  </span>
                  <span className="mr-1">{activeFilters.category}</span>
                  <button
                    onClick={() =>
                      handleFilterClick("category", activeFilters.category)
                    }
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full hover:bg-red-400"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>
              )}

              {activeFilters.severity && (
                <div
                  className="flex items-center rounded-full px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: "#ff7777" }}
                >
                  <span className="mr-2 flex items-center">
                    <span className="flex h-5 w-5 items-center justify-center text-white">
                      {getSeverityProps(activeFilters.severity).icon}
                    </span>
                  </span>
                  <span className="mr-1">{activeFilters.severity}</span>
                  <button
                    onClick={() =>
                      handleFilterClick("severity", activeFilters.severity)
                    }
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full hover:bg-red-400"
                  >
                    <CloseIcon fontSize="small" />
                  </button>
                </div>
              )}

              <button
                onClick={() =>
                  setActiveFilters({ category: null, severity: null })
                }
                className="text-sm font-medium text-blue-500 hover:underline"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </Paper>
    );
  };

  // --- Main Return ---
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
          flexWrap: "wrap",
          mb: 3,
          gap: 1,
        }}
      >
        {" "}
        <Typography variant="h5" sx={{ color: "var(--text-primary)" }}>
          Codebase Analysis
        </Typography>{" "}
        <Box sx={{ display: "flex", gap: 1 }}>
          {" "}
          <Button
            id="history-button"
            aria-controls={historyMenuOpen ? "history-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={historyMenuOpen ? "true" : undefined}
            variant="outlined"
            disabled={loadingHistory || scanHistory.length === 0}
            onClick={handleHistoryMenuClick}
            startIcon={
              loadingHistory ? (
                <CircularProgress
                  size={20}
                  sx={{ color: "var(--text-primary)" }}
                />
              ) : (
                <HistoryIcon sx={{ color: "var(--text-primary)" }} />
              )
            }
            size="small"
            sx={{
              borderColor: "var(--text-secondary)",
              color: "var(--text-primary)",
              "&:hover": {
                borderColor: "var(--text-primary)",
                backgroundColor: "var(--card-bg-hover)",
              },
            }}
          >
            Scan History{" "}
            {scanHistory.length > 0 ? `(${scanHistory.length})` : ""}
          </Button>
          <Menu
            id="history-menu"
            anchorEl={anchorEl}
            open={historyMenuOpen}
            onClose={handleHistoryMenuClose}
            MenuListProps={{ "aria-labelledby": "history-button" }}
            PaperProps={{ style: { maxHeight: 300, width: "35ch" } }}
          >
            {historyError && (
              <MenuItem disabled>
                <Alert severity="error" sx={{ width: "100%" }}>
                  {historyError}
                </Alert>
              </MenuItem>
            )}
            {scanHistory.length === 0 && !loadingHistory && !historyError && (
              <MenuItem disabled>
                <ListItemText primary="No scan history found." />
              </MenuItem>
            )}
            {scanHistory.map((scan) => (
              <MenuItem
                key={scan._id}
                onClick={() => handleViewHistoryScan(scan._id)}
                dense
              >
                <ListItemText
                  primary={`Commit: ${
                    scan.commitSha?.substring(0, 7) || "Unknown"
                  } (${scan.branchName || "N/A"})`}
                  secondary={`${new Date(scan.scanTimestamp).toLocaleString()}`}
                />
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={handleScan}
        disabled={loading || !owner || !repoName}
        sx={{
          mb: 3,
          position: "relative",
          backgroundColor: "var(--button-bg)",
          "&:hover": { backgroundColor: "var(--button-hover-bg)" },
        }}
      >
        {loading ? (
          <>
            <span style={{ visibility: "hidden" }}>Scanning...</span>{" "}
            {/* Placeholder for size */}
            <CircularProgress
              size={24}
              sx={{
                color: "primary.contrastText", // Use contrast text color
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: "-12px",
                marginLeft: "-12px",
              }}
            />
          </>
        ) : (
          "Scan Latest Commit"
        )}
      </Button>

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
        </>
      )}

      {loading && !analysisResult && !error && (
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
            gutterBottom
            sx={{ color: "text.secondary" }}
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
                      fontWeight: "medium",
                      borderColor: "var(--text-secondary)",
                      color: "var(--text-primary)",
                      backgroundColor: "var(--card-bg-hover)",
                    }}
                  />
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontWeight: "medium",
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
                  <Tooltip title="Raw LLM Output (for debugging)">
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
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      <code>
                        {typeof file.rawOutput === "string"
                          ? file.rawOutput
                          : JSON.stringify(file.rawOutput)}
                      </code>
                    </Box>
                  </Tooltip>
                )}
              </Paper>
            ))}
        </Box>
      )}
    </Box>
  );
};

export default CodeAnalysisComponent;
