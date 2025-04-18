// src/components/CodeAnalysis/CodeAnalysisComponent.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
    Button, CircularProgress, Alert, Box, Paper, Typography, Link,
    Grid, Card, CardContent, CardActionArea, Chip, Collapse, IconButton, Tooltip,
    List, ListItem, ListItemText, ListItemButton, Divider, Menu, MenuItem
} from '@mui/material';
// Import new API functions
import { scanRepository, getScanHistory, getSpecificScan } from '../../utils/api';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build'; // For Bad Practice/Smell
import VisibilityIcon from '@mui/icons-material/Visibility'; // For Readability
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'; // For Dead Code
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // For Errors
import InfoIcon from '@mui/icons-material/Info'; // For Info severity
import WarningIcon from '@mui/icons-material/Warning'; // For Medium/Low severity
import ReportProblemIcon from '@mui/icons-material/ReportProblem'; // For High severity
import HistoryIcon from '@mui/icons-material/History'; // For History button
import CachedIcon from '@mui/icons-material/Cached'; // For cached results
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Ensure these are imported
import ExpandLessIcon from '@mui/icons-material/ExpandLess'; // Ensure these are imported
import LaunchIcon from '@mui/icons-material/Launch';     // Ensure these are imported

// Helper to get category icon
const getCategoryIcon = (category) => {
    switch (category) {
        case 'Potential Bug': return <BugReportIcon fontSize="small" sx={{ mr: 0.5 }} />;
        case 'Security Vulnerability': return <SecurityIcon fontSize="small" sx={{ mr: 0.5 }} />;
        case 'Performance Issue': return <SpeedIcon fontSize="small" sx={{ mr: 0.5 }} />;
        case 'Code Smell':
        case 'Bad Practice': return <BuildIcon fontSize="small" sx={{ mr: 0.5 }} />;
        case 'Readability': return <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />;
        case 'Dead Code': return <DeleteSweepIcon fontSize="small" sx={{ mr: 0.5 }} />;
        default: return <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />; // Default/Unknown
    }
};

// Helper to get severity color and icon
const getSeverityProps = (severity) => {
    switch (severity?.toLowerCase()) {
        case 'high': return { color: 'error', icon: <ReportProblemIcon fontSize="inherit" /> };
        case 'medium': return { color: 'warning', icon: <WarningIcon fontSize="inherit" /> };
        case 'low': return { color: 'info', icon: <InfoIcon fontSize="inherit" /> }; // Changed Low to use Info icon like Informational
        case 'informational': return { color: 'success', icon: <InfoIcon fontSize="inherit" /> };
        default: return { color: 'default', icon: <InfoIcon fontSize="inherit" /> }; // Default/Unknown
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
    const [scanHistory, setScanHistory] = useState([]); // State for history list
    const [isViewingHistory, setIsViewingHistory] = useState(false); // Track if showing historical data
    const [anchorEl, setAnchorEl] = useState(null); // For the history menu
    const historyMenuOpen = Boolean(anchorEl);

    const [owner, repoName] = useMemo(() => {
        return repo ? repo.split('/') : ["", ""];
    }, [repo]);

    // Fetch history when component mounts or repo changes
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
                setScanHistory([]); // Clear history on error
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
        // Reset analysis result when repo changes
        setAnalysisResult(null);
        setError(null);
        setIsViewingHistory(false);
        setSelectedFilter({ type: 'all', value: null });
        setExpandedIssues({});

    }, [owner, repoName]); // Depend on owner and repoName


    const handleScan = async () => {
        if (!owner || !repoName) {
            setError('Repository information is missing.');
            return;
        }

        setLoading(true);
        setError(null);
        setAnalysisResult(null); // Clear previous results
        setSelectedFilter({ type: 'all', value: null });
        setExpandedIssues({});
        setIsViewingHistory(false); // Ensure we are not in history view

        try {
            const result = await scanRepository(owner, repoName);
            setAnalysisResult(result);
            // If the scan was new (not cached), refresh the history
            if (!result.isCached) {
                 const historyData = await getScanHistory(owner, repoName);
                 setScanHistory(historyData || []);
            }
        } catch (err) {
            console.error("Scan failed:", err);
            setError(err.message || 'Failed to scan repository. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

     // --- History Menu Handlers ---
     const handleHistoryMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleHistoryMenuClose = () => {
        setAnchorEl(null);
    };

    const handleViewHistoryScan = async (scanId) => {
        handleHistoryMenuClose(); // Close menu
        if (!scanId) return;

        setLoading(true); // Use main loading indicator
        setError(null);
        setAnalysisResult(null); // Clear current view
        setSelectedFilter({ type: 'all', value: null });
        setExpandedIssues({});

        try {
            const historicalScanData = await getSpecificScan(scanId);
            setAnalysisResult(historicalScanData);
            setIsViewingHistory(true); // Set flag
        } catch (err) {
            console.error("Failed to fetch specific scan:", err);
            setError(err.message || `Could not load scan details for ID: ${scanId}`);
            setIsViewingHistory(false);
        } finally {
            setLoading(false);
        }
    };
    // --- End History Menu Handlers ---

    // --- Dashboard Data Calculation ---
     const dashboardData = useMemo(() => {
        if (!analysisResult?.fileAnalyses) return null;
        const counts = { byCategory: {}, bySeverity: {}, totalIssues: 0, filesWithIssues: 0 };
        let calculatedTotalIssues = 0; // Calculate total issues manually for accuracy

        analysisResult.fileAnalyses.forEach(file => {
            if (file.status === 'analyzed' && Array.isArray(file.issues) && file.issues.length > 0) {
                counts.filesWithIssues++;
                file.issues.forEach(issue => {
                     calculatedTotalIssues++; // Increment our manual count
                    // Use || {} and || 0 defensively
                    counts.byCategory[issue.category] = (counts.byCategory[issue.category] || 0) + 1;
                    counts.bySeverity[issue.severity] = (counts.bySeverity[issue.severity] || 0) + 1;
                });
            }
        });
         counts.totalIssues = calculatedTotalIssues; // Assign the calculated count
        return counts;
    }, [analysisResult]);

     const filteredIssuesData = useMemo(() => {
         if (!analysisResult?.fileAnalyses) return [];
         const filesWithFilteredIssues = [];
         analysisResult.fileAnalyses.forEach(file => {
             if (file.status !== 'analyzed' || !Array.isArray(file.issues) || file.issues.length === 0) return;
             const relevantIssues = file.issues.filter(issue => {
                 if (selectedFilter.type === 'all') return true;
                 if (selectedFilter.type === 'category') return issue.category === selectedFilter.value;
                 if (selectedFilter.type === 'severity') return issue.severity === selectedFilter.value;
                 return false;
             });
             if (relevantIssues.length > 0) {
                 filesWithFilteredIssues.push({ ...file, issues: relevantIssues });
             }
         });
         return filesWithFilteredIssues;
     }, [analysisResult, selectedFilter]);


    // ... (handleFilterClick, toggleExpandFile remain the same) ...
     const handleFilterClick = (type, value) => {
         if (selectedFilter.type === type && selectedFilter.value === value) {
             setSelectedFilter({ type: 'all', value: null });
         } else {
             setSelectedFilter({ type, value });
         }
         setExpandedIssues({});
     };

     const toggleExpandFile = (filePath) => {
         setExpandedIssues(prev => ({ ...prev, [filePath]: !prev[filePath] }));
     };


    // --- Render Functions Update ---
    const renderSummary = () => {
        // ... (renderSummary logic remains the same) ...
         if (!analysisResult?.summary) return null;
         const {
             filesAnalyzed = 0, filesSkipped = 0, filesErrored = 0,
             maxFilesAttempted = 'N/A', commitSha, analysisTimestamp
         } = analysisResult.summary;
         const displayTimestamp = analysisResult.scanTimestamp || analysisTimestamp;

         return (
             <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1}}>
                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Scan Summary</Typography>
                    {analysisResult.isCached && (<Chip icon={<CachedIcon fontSize="small"/>} label="Cached Result" size="small" color="info" variant="outlined" sx={{ ml: 2 }}/>)}
                      {isViewingHistory && (<Chip icon={<HistoryIcon fontSize="small"/>} label="Historical Scan" size="small" color="secondary" variant="outlined" sx={{ ml: 2 }}/>)}
                 </Box>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>{commitSha ? `Commit: ${commitSha.substring(0, 7)} | ` : ''} Scanned Branch: {analysisResult.summary.defaultBranch || analysisResult.branchName || 'N/A'}</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>Scan Time: {displayTimestamp ? new Date(displayTimestamp).toLocaleString() : 'N/A'}</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>Max Relevant Files Attempted: {maxFilesAttempted}</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary' }}>Successfully Analyzed: {filesAnalyzed} | Skipped: {filesSkipped} | Errors: {filesErrored}</Typography>
                 {analysisResult.summary.message && (<Typography variant="body2" sx={{ color: analysisResult.isCached || isViewingHistory ? 'text.secondary' : 'info.main', fontStyle: 'italic', mt: 1 }}>{analysisResult.summary.message}</Typography>)}
             </Paper>
         );
    };


    const renderDashboard = () => {
        // ... (renderDashboard logic remains the same - it now correctly accesses the module-level getCategoryIcon/getSeverityProps) ...
         if (!dashboardData) {
             if (analysisResult && analysisResult?.summary?.filesAnalyzed >= 0 && analysisResult?.summary?.totalIssues === 0) { // Check if analyzed >= 0 and totalIssues is explicitly 0
                  return (<Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}><Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography><Typography sx={{ color: 'text.secondary', mt: 1 }}>No issues were identified in this scan.</Typography></Paper>);
             }
             return null;
         }
         if (dashboardData.totalIssues === 0) {
              return (<Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}><Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography><Typography sx={{ color: 'text.secondary', mt: 1 }}>No issues were identified in this scan.</Typography></Paper>);
         }

         const categories = Object.entries(dashboardData.byCategory).sort(([, a], [, b]) => b - a);
         const severities = Object.entries(dashboardData.bySeverity).sort((a, b) => {
             const order = { 'High': 4, 'Medium': 3, 'Low': 2, 'Informational': 1 };
             return (order[b[0]] || 0) - (order[a[0]] || 0);
         });

         return (
             <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Found {dashboardData.totalIssues} total issues across {dashboardData.filesWithIssues} files. Click a category or severity to filter the list below.</Typography>
                 <Grid container spacing={2}>
                     <Grid item xs={12} md={6}>
                         <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Category</Typography>
                         {categories.map(([category, count]) => (
                             <CardActionArea key={category} onClick={() => handleFilterClick('category', category)} sx={{ mb: 1, borderRadius: 1 }}>
                                 <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'category' && selectedFilter.value === category ? 'action.selected' : 'background.default' }}>
                                     <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                         <Box sx={{ display: 'flex', alignItems: 'center' }}>{getCategoryIcon(category)}<Typography variant="body2">{category}</Typography></Box>
                                         <Chip label={count} size="small" sx={{ fontWeight: 'bold' }} />
                                     </CardContent>
                                 </Card>
                             </CardActionArea>
                         ))}
                     </Grid>
                     <Grid item xs={12} md={6}>
                          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Severity</Typography>
                          {severities.map(([severity, count]) => {
                              const severityProps = getSeverityProps(severity);
                              return (
                                  <CardActionArea key={severity} onClick={() => handleFilterClick('severity', severity)} sx={{ mb: 1, borderRadius: 1 }}>
                                      <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'severity' && selectedFilter.value === severity ? 'action.selected' : 'background.default' }}>
                                          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', color: `${severityProps.color}.main` }}>{React.cloneElement(severityProps.icon, { fontSize: 'small', sx: { mr: 0.5 } })}<Typography variant="body2" sx={{ color: `${severityProps.color}.main` }}>{severity}</Typography></Box>
                                              <Chip label={count} size="small" color={severityProps.color} variant="outlined" sx={{ fontWeight: 'bold' }} />
                                          </CardContent>
                                      </Card>
                                  </CardActionArea>
                              );
                          })}
                     </Grid>
                 </Grid>
                 {selectedFilter.type !== 'all' && (<Button size="small" onClick={() => handleFilterClick('all', null)} sx={{ mt: 2 }}>Show All Issues</Button>)}
             </Paper>
         );
    };

    // ... (renderIssueList remains mostly the same, ensure it handles cases where analysisResult might be null initially) ...
     const renderIssueList = () => {
        // Added check for analysisResult existence
         if (!analysisResult || !filteredIssuesData || filteredIssuesData.length === 0) {
             if (selectedFilter.type !== 'all' && dashboardData?.totalIssues > 0) { /* ... no issues match filter ... */
                return (<Typography sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>No issues match the current filter ({selectedFilter.type}: {selectedFilter.value}).</Typography>);
             }
             // Don't show "No issues identified" here if dashboard already shows it or if analysis hasn't run
             return null;
         }
        // ... (rest of issue list rendering logic is the same) ...
         return (
             <Box sx={{ mt: 3 }}>
                 <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                     {selectedFilter.type === 'all' ? 'Identified Issues' : `Filtered Issues (${selectedFilter.type}: ${selectedFilter.value})`}
                     {analysisResult.isCached || isViewingHistory ? ` (from commit ${analysisResult.summary?.commitSha?.substring(0,7) || 'N/A'})` : ''}
                 </Typography>
                  {filteredIssuesData.map((file) => (/* ... Paper and Collapse structure ... */
                    <Paper key={file.filePath} elevation={2} sx={{ p: 0, mb: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => toggleExpandFile(file.filePath)}>
                             <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}> {/* ... File Path, Chip, GitHub Link ... */ }
                                <IconButton size="small" sx={{ mr: 1 }}>{expandedIssues[file.filePath] ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                                <Typography variant="body1" component="span" sx={{ fontWeight: 'medium', color: 'text.primary', mr: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.filePath}>{file.filePath}</Typography>
                                <Chip label={file.issues.length} size="small" sx={{ mr: 1 }} />
                                {file.githubUrl && (<Tooltip title="Open file on GitHub"><IconButton size="small" href={file.githubUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}><LaunchIcon fontSize="inherit" /></IconButton></Tooltip>)}
                             </Box>
                        </Box>
                         <Collapse in={expandedIssues[file.filePath]} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>{file.issues.map((issue, index) => { /* ... Issue Details (Chip, Typography, Code Box) ... */
                                const severityProps = getSeverityProps(issue.severity);
                                return (
                                    <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < file.issues.length - 1 ? '1px dashed' : 'none', borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}> {/* Chips */}
                                            <Chip icon={severityProps.icon} label={issue.severity} size="small" color={severityProps.color} variant="outlined" sx={{ mr: 1, mb: 0.5, fontWeight: 'medium' }}/>
                                            <Chip icon={getCategoryIcon(issue.category)} label={issue.category} size="small" variant="filled" sx={{ mr: 1, mb: 0.5, bgcolor: 'grey.700', color: 'white' }} />
                                        </Box>
                                        <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'text.primary', mb: 0.5 }}>{issue.description}</Typography> {/* Description */}
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}><strong>Explanation:</strong> {issue.explanation}</Typography> {/* Explanation */}
                                        {issue.suggestion && (<Typography variant="body2" sx={{ color: 'info.main', mb: 1 }}><strong>Suggestion:</strong> {issue.suggestion}</Typography>)} {/* Suggestion */}
                                        {issue.code_snippet && (<Box component="pre" sx={{ backgroundColor: '#2d2d2d', p: 1.5, borderRadius: 1, overflowX: 'auto', my: 1, fontSize: '0.875rem', color: '#f0f0f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}><code>{issue.code_snippet}</code></Box>)} {/* Code Snippet */}
                                    </Box>
                                );})}
                             </Box>
                          </Collapse>
                     </Paper>
                 ))}
             </Box>
         );
     };


    // --- Main Return ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, color: 'text.primary' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
                <Typography variant="h5" sx={{ color: 'text.primary' }}>
                    Codebase Analysis
                </Typography>
                {/* History Button */}
                 <Button
                     id="history-button"
                     aria-controls={historyMenuOpen ? 'history-menu' : undefined}
                     aria-haspopup="true"
                     aria-expanded={historyMenuOpen ? 'true' : undefined}
                     variant="outlined"
                     color="secondary"
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
                    {scanHistory.length === 0 && !loadingHistory && !historyError && <MenuItem disabled>No history found.</MenuItem>}
                    {scanHistory.map((scan) => (
                        <MenuItem key={scan._id} onClick={() => handleViewHistoryScan(scan._id)} dense>
                            <ListItemText
                                primary={`Commit: ${scan.commitSha?.substring(0, 7)} (${scan.branchName})`}
                                secondary={`${new Date(scan.scanTimestamp).toLocaleString()}`}
                            />
                        </MenuItem>
                    ))}
                 </Menu>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {isViewingHistory
                    ? 'Viewing a historical scan result.'
                    : 'Scan the latest commit of the default branch or view past scans using the history button.'}
                 Ensure your GEMINI_API_KEY is configured on the server for new scans.
            </Typography>

            {/* Scan Button - Only show if not viewing history? Or allow rescan? Let's allow rescan */}
            <Button
                variant="contained"
                onClick={handleScan}
                disabled={loading}
                sx={{
                    mb: 3,
                    backgroundColor: '#EF4444',
                    '&:hover': { backgroundColor: '#DC2626' },
                    position: 'relative',
                    color: '#ffffff',
                }}
            >
                {loading && !(loadingHistory && !anchorEl) ? ( // Show spinner only if main scan is loading
                    <>
                        <span style={{ visibility: 'hidden' }}>Scanning...</span>
                        <CircularProgress size={24} sx={{ color: 'white', position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px' }} />
                    </>
                ) : (
                    'Scan Latest Commit' // Changed button text
                )}
            </Button>

            {error && ( /* Main error display */
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}>{error}</Alert>
            )}

            {/* Render analysis data if available */}
            {analysisResult && (
                <>
                    {renderSummary()}
                    {renderDashboard()}
                    {renderIssueList()}
                </>
            )}

             {/* Files Not Fully Analyzed section (remains the same) */}
              {analysisResult?.fileAnalyses?.filter(f => f.status === 'error' || f.status === 'skipped').length > 0 && (
                   <Box sx={{ mt: 4 }}>
                       <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>Files Not Fully Analyzed</Typography>
                       {analysisResult.fileAnalyses.filter(f => f.status === 'error' || f.status === 'skipped').map(file => (
                           <Paper key={file.filePath} elevation={1} sx={{ p: 1.5, mb: 1, bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Chip icon={<ErrorOutlineIcon />} label={file.status.toUpperCase()} size="small" color={file.status === 'error' ? 'error' : 'warning'} variant="outlined" sx={{ mr: 1, fontWeight: 'medium' }}/>
                                    <Typography variant="body2" component="span" sx={{ fontWeight: 'medium', color: 'text.primary', mr: 1, flexGrow: 1 }}>{file.filePath}</Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Reason: {file.error_message || file.skip_reason}</Typography>
                                {file.rawOutput && (<Tooltip title="Raw LLM Output (for debugging)"><Box component="pre" sx={{ backgroundColor: '#2d2d2d', p: 1, borderRadius: 1, overflowX: 'auto', mt: 1, fontSize: '0.75rem', color: '#ccc', maxHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}><code>{file.rawOutput}</code></Box></Tooltip>)}
                           </Paper>
                       ))}
                   </Box>
              )}

        </Box>
    );
};

export default CodeAnalysisComponent;