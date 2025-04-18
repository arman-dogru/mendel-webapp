// src/components/CodeAnalysis/CodeAnalysisComponent.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
    Button, CircularProgress, Alert, Box, Paper, Typography, Link,
    Grid, Card, CardContent, CardActionArea, Chip, Collapse, IconButton, Tooltip,
    List, ListItem, ListItemText, ListItemButton, Divider, Menu, MenuItem, Stack // <-- Import Stack
} from '@mui/material';
import { scanRepository, getScanHistory, getSpecificScan } from '../../utils/api';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HistoryIcon from '@mui/icons-material/History';
import CachedIcon from '@mui/icons-material/Cached';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LaunchIcon from '@mui/icons-material/Launch';

// Helper to get category icon - REMOVE margin, Stack will handle spacing
const getCategoryIcon = (category) => {
    // Remove sx={{ mr: 1 }} - let Stack handle spacing
    const iconProps = { fontSize: "small", sx: { /* Removed mr */ } };
    switch (category) {
        case 'Potential Bug': return <BugReportIcon {...iconProps} />;
        case 'Security Vulnerability': return <SecurityIcon {...iconProps} />;
        case 'Performance Issue': return <SpeedIcon {...iconProps} />;
        case 'Code Smell': // Combined Code Smell and Bad Practice for the BuildIcon
        case 'Bad Practice': return <BuildIcon {...iconProps} />;
        case 'Readability': return <VisibilityIcon {...iconProps} />;
        case 'Dead Code': return <DeleteSweepIcon {...iconProps} />;
        default: return <CodeIcon {...iconProps} />; // Default/Unknown
    }
};


// Helper to get severity color and icon - REMOVE margin, Stack will handle spacing
const getSeverityProps = (severity) => {
    // Remove sx={{ mr: 1 }} - let Stack handle spacing
    const iconBaseProps = { fontSize: "small", sx: { /* Removed mr */ } };
    switch (severity?.toLowerCase()) {
        case 'high': return { color: 'error', icon: <ReportProblemIcon {...iconBaseProps} /> };
        case 'medium': return { color: 'warning', icon: <WarningIcon {...iconBaseProps} /> };
        case 'low': return { color: 'info', icon: <InfoIcon {...iconBaseProps} /> };
        case 'informational': return { color: 'success', icon: <InfoIcon {...iconBaseProps} /> }; // Use success for informational
        default: return { color: 'default', icon: <InfoIcon {...iconBaseProps} /> }; // Default/Unknown
    }
};

const CodeAnalysisComponent = ({ repo }) => {
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);
    const [historyError, setHistoryError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState({ type: 'all', value: null });
    const [expandedIssues, setExpandedIssues] = useState({});
    const [scanHistory, setScanHistory] = useState([]);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const historyMenuOpen = Boolean(anchorEl);

    const [owner, repoName] = useMemo(() => {
        return repo ? repo.split('/') : ["", ""];
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
        setSelectedFilter({ type: 'all', value: null });
        setExpandedIssues({});
    }, [owner, repoName]);

     const handleScan = async () => {
        if (!owner || !repoName) { setError('Repository information is missing.'); return; }
        setLoading(true); setError(null); setAnalysisResult(null); setSelectedFilter({ type: 'all', value: null }); setExpandedIssues({}); setIsViewingHistory(false);
        try {
            const result = await scanRepository(owner, repoName);
            setAnalysisResult(result);
            // Only refetch history if the scan wasn't cached (i.e., a new scan was performed)
            if (!result.isCached) {
                 const historyData = await getScanHistory(owner, repoName);
                 setScanHistory(historyData || []);
            }
        } catch (err) { console.error("Scan failed:", err); setError(err.message || 'Failed to scan repository. Check console for details.'); } finally { setLoading(false); }
    };

     const handleHistoryMenuClick = (event) => setAnchorEl(event.currentTarget);
     const handleHistoryMenuClose = () => setAnchorEl(null);

     const handleViewHistoryScan = async (scanId) => {
        handleHistoryMenuClose();
        if (!scanId) return;
        setLoading(true);
        setError(null);
        setAnalysisResult(null);
        setSelectedFilter({ type: 'all', value: null });
        setExpandedIssues({});
        try {
            const historicalScanData = await getSpecificScan(scanId);
            setAnalysisResult(historicalScanData);
            setIsViewingHistory(true); // Mark that we are viewing a historical scan
        } catch (err) {
            console.error("Failed to fetch specific scan:", err);
            setError(err.message || `Could not load scan details for ID: ${scanId}`);
            setIsViewingHistory(false);
        } finally {
            setLoading(false);
        }
    };

     const handleFilterClick = (type, value) => {
        // If clicking the already active filter, clear it
        if (selectedFilter.type === type && selectedFilter.value === value) {
            setSelectedFilter({ type: 'all', value: null });
        } else {
            setSelectedFilter({ type, value });
        }
        setExpandedIssues({}); // Collapse all issues when filter changes
    };

     const toggleExpandFile = (filePath) => {
        setExpandedIssues(prev => ({ ...prev, [filePath]: !prev[filePath] }));
    };

     // Calculate dashboard counts from analysisResult
     const dashboardData = useMemo(() => {
        if (!analysisResult?.fileAnalyses) return null;

        const counts = {
            byCategory: {},
            bySeverity: {},
            totalIssues: 0,
            filesWithIssues: 0
        };

        let calculatedTotalIssues = 0;
        const filesWithIssuesSet = new Set();

        analysisResult.fileAnalyses.forEach(file => {
            if (file.status === 'analyzed' && Array.isArray(file.issues) && file.issues.length > 0) {
                filesWithIssuesSet.add(file.filePath); // Track files with issues
                file.issues.forEach(issue => {
                    calculatedTotalIssues++;
                    // Ensure category and severity exist before incrementing
                    if (issue.category) {
                        counts.byCategory[issue.category] = (counts.byCategory[issue.category] || 0) + 1;
                    }
                    if (issue.severity) {
                         // Standardize severity capitalization for grouping
                        const standardizedSeverity = issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1).toLowerCase();
                        counts.bySeverity[standardizedSeverity] = (counts.bySeverity[standardizedSeverity] || 0) + 1;
                    }
                });
            }
        });

        counts.totalIssues = calculatedTotalIssues;
        counts.filesWithIssues = filesWithIssuesSet.size;

        return counts;
    }, [analysisResult]);

     // Filter issues based on selected filter
     const filteredIssuesData = useMemo(() => {
         if (!analysisResult?.fileAnalyses) return [];

         const filesWithFilteredIssues = [];

         analysisResult.fileAnalyses.forEach(file => {
             if (file.status !== 'analyzed' || !Array.isArray(file.issues) || file.issues.length === 0) {
                 return; // Skip files not analyzed or without issues
             }

             const relevantIssues = file.issues.filter(issue => {
                 if (selectedFilter.type === 'all') return true;
                 if (selectedFilter.type === 'category') return issue.category === selectedFilter.value;
                 if (selectedFilter.type === 'severity') {
                     // Standardize severity for comparison
                    const standardizedSeverity = issue.severity?.charAt(0).toUpperCase() + issue.severity?.slice(1).toLowerCase();
                    return standardizedSeverity === selectedFilter.value;
                 }
                 return false;
             });

             if (relevantIssues.length > 0) {
                 // Only include the file if it has issues matching the filter
                 filesWithFilteredIssues.push({ ...file, issues: relevantIssues });
             }
         });

         return filesWithFilteredIssues;
     }, [analysisResult, selectedFilter]);

    // --- Render Functions ---

    const renderSummary = () => {
         if (!analysisResult?.summary) return null;
         const { filesAnalyzed = 0, filesSkipped = 0, filesErrored = 0, maxFilesAttempted = 'N/A', commitSha, analysisTimestamp, defaultBranch, branchName } = analysisResult.summary;
         // Prefer scanTimestamp if available (for historical scans), fallback to analysisTimestamp
         const displayTimestamp = analysisResult.scanTimestamp || analysisTimestamp;
         const displayBranch = defaultBranch || branchName || 'N/A'; // Use defaultBranch from summary or branchName from top level

         return (
             <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1}}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Scan Summary</Typography>
                    <Box> {/* Container for chips */}
                        {analysisResult.isCached && (
                            <Chip
                                icon={<CachedIcon fontSize="small" />}
                                label="Cached Result"
                                size="small"
                                color="info"
                                variant="filled" // Filled looks better here
                                sx={{ ml: 1, bgcolor: 'info.main', color: 'info.contrastText' }} // Ensure text is visible
                            />
                        )}
                        {isViewingHistory && (
                            <Chip
                                icon={<HistoryIcon fontSize="small"/>}
                                label="Historical Scan"
                                size="small"
                                color="secondary"
                                variant="filled" // Filled looks better here
                                sx={{ ml: 1, bgcolor: 'secondary.main', color: 'secondary.contrastText' }} // Ensure text is visible
                            />
                        )}
                    </Box>
                 </Box>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {commitSha ? `Commit: ${commitSha.substring(0, 7)} | ` : ''} Scanned Branch: {displayBranch}
                 </Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Scan Time: {displayTimestamp ? new Date(displayTimestamp).toLocaleString() : 'N/A'}
                 </Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>Max Relevant Files Attempted: {maxFilesAttempted}</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>Successfully Analyzed: {filesAnalyzed} | Skipped: {filesSkipped} | Errors: {filesErrored}</Typography>
                 {analysisResult.summary.message && (
                     <Typography variant="body2" sx={{ color: analysisResult.isCached || isViewingHistory ? 'text.secondary' : 'info.main', fontStyle: 'italic', mt: 1 }}>
                         {analysisResult.summary.message}
                     </Typography>
                 )}
             </Paper>
         );
    };

    const renderIssueList = () => {
         if (!analysisResult || !filteredIssuesData || filteredIssuesData.length === 0) {
             // If filters are active and no issues match, show a message
             if (selectedFilter.type !== 'all' && dashboardData?.totalIssues > 0) {
                return (<Typography sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>No issues match the current filter ({selectedFilter.type}: {selectedFilter.value}).</Typography>);
             }
             // Don't show anything if there were no issues found at all initially and no filter is active
             if (!dashboardData || dashboardData.totalIssues === 0) {
                 return null;
             }
             // If filters are cleared (back to 'all') but there were issues originally, don't show 'no issues match'
             if (selectedFilter.type === 'all' && dashboardData?.totalIssues > 0){
                 // This case means filteredIssuesData is somehow empty despite dashboardData having issues,
                 // which shouldn't happen with the current logic, but guard against it.
                 // Or it could mean renderIssueList is called before filteredIssuesData is ready.
                 // Let's return null for now, but might need investigation if it occurs.
                 return null;
             }
             return null; // Default case: No issues to display or filter cleared
         }

         return (
             <Box sx={{ mt: 3 }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                     {selectedFilter.type === 'all' ? 'Identified Issues' : `Filtered Issues (${selectedFilter.type}: ${selectedFilter.value})`}
                     {/* Add commit SHA context when showing results from cache or history */}
                     {(analysisResult.isCached || isViewingHistory) && analysisResult.summary?.commitSha &&
                        ` (from commit ${analysisResult.summary.commitSha.substring(0,7)})`
                     }
                 </Typography>
                  {filteredIssuesData.map((file) => (
                    <Paper key={file.filePath} elevation={2} sx={{ p: 0, mb: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                        {/* File Header - Clickable to expand/collapse */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 1.5,
                                borderBottom: expandedIssues[file.filePath] ? '1px solid' : 'none', // Only show border when expanded
                                borderColor: 'divider',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => toggleExpandFile(file.filePath)}
                         >
                             {/* Left side: Icon, File Path, Count, GitHub Link */}
                             <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}> {/* minWidth: 0 prevents overflow issues */}
                                <IconButton size="small" sx={{ mr: 0.5 }}>{/* Reduced margin */}
                                    {expandedIssues[file.filePath] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                                <Typography
                                    variant="body1"
                                    component="span"
                                    sx={{
                                        fontWeight: 'medium',
                                        color: 'text.primary',
                                        mr: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                    title={file.filePath} // Tooltip for long paths
                                >
                                    {file.filePath}
                                </Typography>
                                <Chip label={file.issues.length} size="small" sx={{ mr: 1 }} />
                                {file.githubUrl && (
                                    <Tooltip title="Open file on GitHub">
                                        <IconButton
                                            size="small"
                                            href={file.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()} // Prevent card collapse/expand when clicking link
                                            sx={{
                                                color: 'text.secondary',
                                                '&:hover': { color: 'primary.main' }
                                            }}
                                        >
                                            <LaunchIcon fontSize="inherit" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                             </Box>
                             {/* Right side can be added here if needed */}
                        </Box>
                         {/* Collapsible Issue Details */}
                         <Collapse in={expandedIssues[file.filePath]} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                {file.issues.map((issue, index) => {
                                    const severityProps = getSeverityProps(issue.severity);
                                    return (
                                        <Box key={index} sx={{
                                            mb: index < file.issues.length - 1 ? 2 : 0, // No margin on last item
                                            pb: index < file.issues.length - 1 ? 2 : 0, // No padding-bottom on last item
                                            borderBottom: index < file.issues.length - 1 ? '1px dashed' : 'none',
                                            borderColor: 'divider'
                                        }}>
                                            {/* Issue Badges: Severity and Category */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                <Tooltip title={`Severity: ${issue.severity || 'Unknown'}`}>
                                                   <Chip
                                                      icon={severityProps.icon}
                                                      size="small"
                                                      color={severityProps.color}
                                                      variant="outlined"
                                                      sx={{
                                                          fontWeight: 'medium',
                                                          minWidth: 'auto', // Allow chip to shrink
                                                          '& .MuiChip-icon': {
                                                               marginLeft: '5px', // Standard spacing
                                                               marginRight: '-6px', // Pull text closer
                                                               color: `${severityProps.color}.main` // Explicit icon color
                                                          },
                                                          borderColor: `${severityProps.color}.main`,
                                                          color: `${severityProps.color}.main`
                                                      }}
                                                   />
                                                </Tooltip>
                                                {issue.category && (
                                                    <Tooltip title={`Category: ${issue.category}`}>
                                                        <Chip
                                                            icon={getCategoryIcon(issue.category)}
                                                            size="small"
                                                            variant="filled"
                                                            color="default"
                                                            sx={{
                                                                minWidth: 'auto',
                                                                '& .MuiChip-icon': {
                                                                    marginLeft: '5px',
                                                                    marginRight: '-6px'
                                                                },
                                                                bgcolor: 'action.selected' // Subtle background
                                                            }}
                                                         />
                                                    </Tooltip>
                                                )}
                                                {/* Optional: Line number chip */}
                                                {issue.line && (
                                                   <Tooltip title={`Line: ${issue.line}`}>
                                                        <Chip
                                                            label={`L${issue.line}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ minWidth: 'auto', height: '20px', fontSize: '0.75rem' }}
                                                         />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            {/* Issue Details */}
                                            <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'text.primary', mb: 0.5 }}>{issue.description}</Typography>
                                            {issue.explanation && (<Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}><strong>Explanation:</strong> {issue.explanation}</Typography>)}
                                            {issue.suggestion && (<Typography variant="body2" sx={{ color: 'info.main', mb: 1 }}><strong>Suggestion:</strong> {issue.suggestion}</Typography>)}
                                            {/* Code Snippet */}
                                            {issue.code_snippet && (
                                                <Box component="pre" sx={{
                                                    backgroundColor: '#2d2d2d', // Dark background for code
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    overflowX: 'auto',
                                                    my: 1, // Margin top/bottom
                                                    fontSize: '0.875rem', // Slightly smaller font
                                                    color: '#f0f0f0', // Light text color
                                                    whiteSpace: 'pre-wrap', // Wrap long lines
                                                    wordBreak: 'break-all' // Break words if needed
                                                }}>
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

    // --- UPDATED renderDashboard Function ---
    const renderDashboard = () => {
         if (!dashboardData) {
            // Handle the case where analysisResult exists but dashboardData couldn't be calculated (e.g., no fileAnalyses)
            // Or the initial state before any analysis.
            if (analysisResult && analysisResult?.summary?.filesAnalyzed >= 0 && (!dashboardData || dashboardData?.totalIssues === 0)) {
                 // Show "No issues identified" if scan completed but found nothing.
                 return (
                    <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography>
                        <Typography sx={{ color: 'text.secondary', mt: 1 }}>No issues were identified in this scan.</Typography>
                    </Paper>
                 );
            }
            // Don't render the dashboard section if there's no data yet (e.g., initial load)
            return null;
         }

         // Explicitly handle the case where data exists but total issues are zero
         if (dashboardData.totalIssues === 0) {
              return (
                  <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography>
                      <Typography sx={{ color: 'text.secondary', mt: 1 }}>No issues were identified in this scan.</Typography>
                  </Paper>
              );
         }

         // Sort categories by count (descending)
         const categories = Object.entries(dashboardData.byCategory).sort(([, a], [, b]) => b - a);
         // Sort severities by importance (High > Medium > Low > Informational)
         const severities = Object.entries(dashboardData.bySeverity).sort((a, b) => {
             const order = { 'High': 4, 'Medium': 3, 'Low': 2, 'Informational': 1 };
             // Use lowercase keys for lookup robustness if needed, but dashboardData uses capitalized keys
             return (order[b[0]] || 0) - (order[a[0]] || 0);
         });

         return (
             <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                     Found {dashboardData.totalIssues} total issues across {dashboardData.filesWithIssues} files. Click a category or severity to filter the list below.
                 </Typography>
                 <Grid container spacing={2}>
                     {/* By Category Column */}
                     <Grid item xs={12} md={6}>
                         <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Category</Typography>
                         {categories.map(([category, count]) => (
                             <CardActionArea
                                key={category}
                                onClick={() => handleFilterClick('category', category)}
                                sx={{ mb: 1, borderRadius: 1 }}
                             >
                                 <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'category' && selectedFilter.value === category ? 'action.selected' : 'background.default' }}>
                                     <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                         {/* --- FIX START (Use Stack for alignment) --- */}
                                         <Stack direction="row" alignItems="center" spacing={1}> {/* Use Stack with spacing */}
                                            {getCategoryIcon(category)}
                                            <Typography variant="body2"> {/* Text remains the same */}
                                                {category}
                                            </Typography>
                                        </Stack>
                                         {/* --- FIX END --- */}
                                         <Chip label={count} size="small" sx={{ fontWeight: 'bold' }} />
                                     </CardContent>
                                 </Card>
                             </CardActionArea>
                         ))}
                     </Grid>
                     {/* By Severity Column */}
                     <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Severity</Typography>
                          {severities.map(([severity, count]) => {
                              const severityProps = getSeverityProps(severity);
                              return (
                                  <CardActionArea
                                      key={severity}
                                      onClick={() => handleFilterClick('severity', severity)}
                                      sx={{ mb: 1, borderRadius: 1 }}
                                  >
                                      <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'severity' && selectedFilter.value === severity ? 'action.selected' : 'background.default' }}>
                                          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                             {/* --- FIX START (Use Stack for alignment & color) --- */}
                                             {/* Apply color to the Stack to affect both icon and text */}
                                             <Stack direction="row" alignItems="center" spacing={1} sx={{ color: `${severityProps.color}.main` }}>
                                                {severityProps.icon}
                                                {/* Inherit color from Stack */}
                                                <Typography variant="body2" sx={{ color: 'inherit' }}>
                                                    {severity}
                                                  </Typography>
                                              </Stack>
                                             {/* --- FIX END --- */}
                                              {/* Use severity color for chip background */}
                                              <Chip
                                                 label={count}
                                                 size="small"
                                                 variant="filled" // Filled chip stands out
                                                 sx={{
                                                     fontWeight: 'bold',
                                                     bgcolor: `${severityProps.color}.main`,
                                                     color: `${severityProps.color}.contrastText` // Ensure text is readable
                                                 }}
                                              />
                                          </CardContent>
                                      </Card>
                                  </CardActionArea>
                              );
                          })}
                     </Grid>
                 </Grid>
                 {/* Show "Clear Filter" button only when a filter is active */}
                 {selectedFilter.type !== 'all' && (
                    <Button size="small" onClick={() => handleFilterClick('all', null)} sx={{ mt: 2 }}>
                       Show All Issues
                    </Button>
                 )}
             </Paper>
         );
    };


    // --- Main Return ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, color: 'text.primary' }}>
            {/* Header, History, Scan Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 3, gap: 1 }}> {/* Allow wrap and add gap */}
                 <Typography variant="h5" sx={{ color: 'white' }}>
                     Codebase Analysis
                 </Typography> {/* Use primary text color */}
                 <Box sx={{ display: 'flex', gap: 1}}> {/* Group buttons */}
                     <Button
                         id="history-button"
                         aria-controls={historyMenuOpen ? 'history-menu' : undefined}
                         aria-haspopup="true"
                         aria-expanded={historyMenuOpen ? 'true' : undefined}
                         variant="outlined"
                         color="secondary" // Use theme color
                         disabled={loadingHistory || scanHistory.length === 0}
                         onClick={handleHistoryMenuClick}
                         startIcon={loadingHistory ? <CircularProgress size={20} color="inherit"/> : <HistoryIcon />}
                         size="small"
                      >
                         Scan History {scanHistory.length > 0 ? `(${scanHistory.length})` : ''}
                     </Button>
                     <Menu
                         id="history-menu"
                         anchorEl={anchorEl}
                         open={historyMenuOpen}
                         onClose={handleHistoryMenuClose}
                         MenuListProps={{ 'aria-labelledby': 'history-button' }}
                         PaperProps={{ style: { maxHeight: 300, width: '35ch' } }} // Limit height and set width
                      >
                        {historyError && <MenuItem disabled><Alert severity="error" sx={{width: '100%'}}>{historyError}</Alert></MenuItem>}
                        {scanHistory.length === 0 && !loadingHistory && !historyError && <MenuItem disabled><ListItemText primary="No scan history found." /></MenuItem>}
                        {scanHistory.map((scan) => (
                            <MenuItem key={scan._id} onClick={() => handleViewHistoryScan(scan._id)} dense>
                               <ListItemText
                                    primary={`Commit: ${scan.commitSha?.substring(0, 7) || 'Unknown'} (${scan.branchName || 'N/A'})`}
                                    secondary={`${new Date(scan.scanTimestamp).toLocaleString()}`}
                                />
                            </MenuItem>
                         ))}
                     </Menu>
                 </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'white', mb: 3 }}>
                Scan the latest commit of the default branch (main) or view past scans. Ensure GEMINI_API_KEY is configured server-side for new scans.
            </Typography>
            <Button
                variant="contained"
                color="primary" // Use theme color
                onClick={handleScan}
                disabled={loading || !owner || !repoName} // Disable if loading or no repo selected
                sx={{ mb: 3, position: 'relative' }}
             >
                 {loading ? (
                     <>
                         <span style={{ visibility: 'hidden' }}>Scanning...</span> {/* Placeholder for size */}
                         <CircularProgress
                             size={24}
                             sx={{
                                 color: 'primary.contrastText', // Use contrast text color
                                 position: 'absolute',
                                 top: '50%', left: '50%',
                                 marginTop: '-12px', marginLeft: '-12px'
                             }}
                         />
                     </>
                 ) : (
                     'Scan Latest Commit'
                 )}
             </Button>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}> {/* Darker background */}
                    {error}
                </Alert>
            )}

            {/* Render conditional content: Summary, Dashboard, Issues */}
            {analysisResult && (
                <>
                    {renderSummary()}
                    {renderDashboard()} {/* Dashboard rendering function with fixes */}
                    {renderIssueList()}
                </>
            )}

             {/* Display only when loading and no results/error yet */}
             {loading && !analysisResult && !error && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Skipped/Errored Files Section */}
            {analysisResult?.fileAnalyses?.filter(f => f.status === 'error' || f.status === 'skipped').length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>Files Not Fully Analyzed</Typography>
                    {analysisResult.fileAnalyses
                        .filter(f => f.status === 'error' || f.status === 'skipped')
                        .map(file => (
                            <Paper key={file.filePath} elevation={1} sx={{ p: 1.5, mb: 1, bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Chip
                                        icon={file.status === 'error' ? <ErrorOutlineIcon /> : <WarningIcon />}
                                        label={file.status.toUpperCase()}
                                        size="small"
                                        color={file.status === 'error' ? 'error' : 'warning'}
                                        variant="outlined"
                                        sx={{ mr: 1, fontWeight: 'medium' }}
                                    />
                                    <Typography variant="body2" component="span" sx={{ fontWeight: 'medium', color: 'text.primary', mr: 1, wordBreak: 'break-all' }}> {/* Allow breaking path */}
                                        {file.filePath}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                    Reason: {file.error_message || file.skip_reason || 'No specific reason provided.'}
                                </Typography>
                                {/* Optional: Show raw output for debugging */}
                                {file.rawOutput && (
                                    <Tooltip title="Raw LLM Output (for debugging)">
                                        <Box component="pre" sx={{
                                                backgroundColor: '#2d2d2d', p: 1, borderRadius: 1,
                                                overflowX: 'auto', mt: 1, fontSize: '0.75rem',
                                                color: '#ccc', maxHeight: '100px',
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            <code>{typeof file.rawOutput === 'string' ? file.rawOutput : JSON.stringify(file.rawOutput)}</code>
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