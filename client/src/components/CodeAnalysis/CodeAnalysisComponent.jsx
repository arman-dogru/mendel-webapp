// src/components/CodeAnalysis/CodeAnalysisComponent.jsx

import React, { useState, useMemo } from 'react';
import {
    Button, CircularProgress, Alert, Box, Paper, Typography, Link,
    Grid, Card, CardContent, CardActionArea, Chip, Collapse, IconButton, Tooltip
} from '@mui/material';
import { scanRepository } from '../../utils/api'; // Adjust path as needed
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LaunchIcon from '@mui/icons-material/Launch'; // For GitHub link

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
        default: return <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />;
    }
};

// Helper to get severity color and icon
const getSeverityProps = (severity) => {
    switch (severity?.toLowerCase()) {
        case 'high': return { color: 'error', icon: <ReportProblemIcon fontSize="inherit" /> };
        case 'medium': return { color: 'warning', icon: <WarningIcon fontSize="inherit" /> };
        case 'low': return { color: 'info', icon: <WarningIcon fontSize="inherit" /> }; // Or InfoIcon
        case 'informational': return { color: 'success', icon: <InfoIcon fontSize="inherit" /> }; // Use success for info, or a neutral grey
        default: return { color: 'default', icon: <InfoIcon fontSize="inherit" /> };
    }
};


const CodeAnalysisComponent = ({ repo }) => {
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null); // Stores the whole { summary, fileAnalyses } object
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState({ type: 'all', value: null }); // e.g., { type: 'category', value: 'Potential Bug' }
    const [expandedIssues, setExpandedIssues] = useState({}); // Track expanded file sections { [filePath]: boolean }

    const handleScan = async () => {
        if (!repo) {
            setError('Repository information is missing.');
            return;
        }

        const [owner, repoName] = repo.split('/');
        if (!owner || !repoName) {
            setError('Invalid repository format. Expected "owner/repoName".');
            return;
        }

        setLoading(true);
        setError(null);
        setAnalysisResult(null);
        setSelectedFilter({ type: 'all', value: null }); // Reset filter on new scan
        setExpandedIssues({}); // Reset expanded state

        try {
            // The API now returns the structured object directly
            const result = await scanRepository(owner, repoName);
            setAnalysisResult(result);
        } catch (err) {
            console.error("Scan failed:", err);
            setError(err.message || 'Failed to scan repository. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    // Memoize dashboard data calculation
    const dashboardData = useMemo(() => {
        if (!analysisResult?.fileAnalyses) return null;

        const counts = {
            byCategory: {},
            bySeverity: {},
            totalIssues: 0,
            filesWithIssues: 0,
        };

        analysisResult.fileAnalyses.forEach(file => {
            if (file.status === 'analyzed' && file.issues.length > 0) {
                counts.filesWithIssues++;
                file.issues.forEach(issue => {
                    counts.totalIssues++;
                    counts.byCategory[issue.category] = (counts.byCategory[issue.category] || 0) + 1;
                    counts.bySeverity[issue.severity] = (counts.bySeverity[issue.severity] || 0) + 1;
                });
            }
        });
        return counts;
    }, [analysisResult]);

    // Memoize filtered issues calculation
    const filteredIssuesData = useMemo(() => {
        if (!analysisResult?.fileAnalyses) return [];

        const filesWithFilteredIssues = [];

        analysisResult.fileAnalyses.forEach(file => {
            if (file.status !== 'analyzed' || !file.issues || file.issues.length === 0) {
                return; // Skip files not analyzed or without issues
            }

            const relevantIssues = file.issues.filter(issue => {
                if (selectedFilter.type === 'all') return true;
                if (selectedFilter.type === 'category') return issue.category === selectedFilter.value;
                if (selectedFilter.type === 'severity') return issue.severity === selectedFilter.value;
                return false;
            });

            if (relevantIssues.length > 0) {
                filesWithFilteredIssues.push({
                    ...file, // Keep file path, githubUrl etc.
                    issues: relevantIssues // Only include the filtered issues
                });
            }
        });

        return filesWithFilteredIssues;

    }, [analysisResult, selectedFilter]);

    const handleFilterClick = (type, value) => {
        if (selectedFilter.type === type && selectedFilter.value === value) {
            setSelectedFilter({ type: 'all', value: null }); // Toggle off if clicked again
        } else {
            setSelectedFilter({ type, value });
        }
         setExpandedIssues({}); // Collapse all when filter changes
    };

    const toggleExpandFile = (filePath) => {
        setExpandedIssues(prev => ({ ...prev, [filePath]: !prev[filePath] }));
    };

    // --- Render Functions ---

    const renderSummary = () => {
        if (!analysisResult?.summary) return null;
        const { filesAnalyzed, filesSkipped, filesErrored, maxFilesAttempted } = analysisResult.summary;
        return (
            <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Scan Summary</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Attempted to analyze up to {maxFilesAttempted} relevant files.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Successfully Analyzed: {filesAnalyzed} | Skipped: {filesSkipped} | Errors: {filesErrored}
                </Typography>
                 {analysisResult.summary.message && (
                     <Typography variant="body2" sx={{ color: 'info.main', mt: 1 }}>
                         {analysisResult.summary.message}
                     </Typography>
                 )}
            </Paper>
        );
    };

    const renderDashboard = () => {
        if (!dashboardData || dashboardData.totalIssues === 0) return null;

        const categories = Object.entries(dashboardData.byCategory).sort(([, a], [, b]) => b - a); // Sort by count desc
        const severities = Object.entries(dashboardData.bySeverity).sort((a, b) => { // Sort High > Med > Low > Info
            const order = { 'High': 4, 'Medium': 3, 'Low': 2, 'Informational': 1 };
            return (order[b[0]] || 0) - (order[a[0]] || 0);
        });


        return (
            <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>Issue Dashboard</Typography>
                 <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Found {dashboardData.totalIssues} total issues across {dashboardData.filesWithIssues} files. Click a category or severity to filter the list below.
                 </Typography>
                <Grid container spacing={2}>
                    {/* Issues by Category */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Category</Typography>
                        {categories.map(([category, count]) => (
                            <CardActionArea key={category} onClick={() => handleFilterClick('category', category)} sx={{ mb: 1, borderRadius: 1 }}>
                                <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'category' && selectedFilter.value === category ? 'action.selected' : 'background.default' }}>
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {getCategoryIcon(category)}
                                            <Typography variant="body2">{category}</Typography>
                                        </Box>
                                        <Chip label={count} size="small" sx={{ fontWeight: 'bold' }} />
                                    </CardContent>
                                </Card>
                            </CardActionArea>
                        ))}
                    </Grid>
                    {/* Issues by Severity */}
                    <Grid item xs={12} md={6}>
                         <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>By Severity</Typography>
                         {severities.map(([severity, count]) => {
                             const severityProps = getSeverityProps(severity);
                             return (
                                 <CardActionArea key={severity} onClick={() => handleFilterClick('severity', severity)} sx={{ mb: 1, borderRadius: 1 }}>
                                     <Card variant="outlined" sx={{ bgcolor: selectedFilter.type === 'severity' && selectedFilter.value === severity ? 'action.selected' : 'background.default' }}>
                                         <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                             <Box sx={{ display: 'flex', alignItems: 'center', color: `${severityProps.color}.main` }}>
                                                 {React.cloneElement(severityProps.icon, { fontSize: 'small', sx: { mr: 0.5 } })}
                                                 <Typography variant="body2" sx={{ color: `${severityProps.color}.main` }}>{severity}</Typography>
                                             </Box>
                                             <Chip label={count} size="small" color={severityProps.color} variant="outlined" sx={{ fontWeight: 'bold' }} />
                                         </CardContent>
                                     </Card>
                                 </CardActionArea>
                             );
                         })}
                    </Grid>
                </Grid>
                {selectedFilter.type !== 'all' && (
                     <Button size="small" onClick={() => handleFilterClick('all', null)} sx={{ mt: 2 }}>
                         Show All Issues
                     </Button>
                 )}
            </Paper>
        );
    };

    const renderIssueList = () => {
        if (!analysisResult || filteredIssuesData.length === 0) {
             // Show message if filtering resulted in no issues
             if (selectedFilter.type !== 'all' && dashboardData?.totalIssues > 0) {
                 return (
                     <Typography sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
                         No issues match the current filter ({selectedFilter.type}: {selectedFilter.value}).
                     </Typography>
                 );
             }
             // Show only if there are no issues at all after analysis
             if (dashboardData && dashboardData.totalIssues === 0 && analysisResult?.summary?.filesAnalyzed > 0) {
                  return (
                      <Typography sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
                          No code quality issues were identified in the analyzed files.
                      </Typography>
                  );
             }
            return null; // No data yet or really no issues found initially
        }

        return (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                    {selectedFilter.type === 'all' ? 'All Identified Issues' : `Filtered Issues (${selectedFilter.type}: ${selectedFilter.value})`}
                </Typography>

                {filteredIssuesData.map((file) => (
                    <Paper key={file.filePath} elevation={2} sx={{ p: 0, mb: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 1.5,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => toggleExpandFile(file.filePath)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                <IconButton size="small" sx={{ mr: 1 }}>
                                    {expandedIssues[file.filePath] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                                <Typography variant="body1" component="span" sx={{ fontWeight: 'medium', color: 'text.primary', mr: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.filePath}>
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
                                            onClick={(e) => e.stopPropagation()} // Prevent card expansion
                                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                         >
                                             <LaunchIcon fontSize="inherit" />
                                        </IconButton>
                                     </Tooltip>
                                )}
                            </Box>
                        </Box>
                        <Collapse in={expandedIssues[file.filePath]} timeout="auto" unmountOnExit>
                             <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                {file.issues.map((issue, index) => {
                                    const severityProps = getSeverityProps(issue.severity);
                                    return (
                                        <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < file.issues.length - 1 ? '1px dashed' : 'none', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                <Chip
                                                    icon={severityProps.icon}
                                                    label={issue.severity}
                                                    size="small"
                                                    color={severityProps.color}
                                                    variant="outlined"
                                                    sx={{ mr: 1, fontWeight: 'medium' }}
                                                />
                                                 <Chip
                                                     icon={getCategoryIcon(issue.category)}
                                                     label={issue.category}
                                                     size="small"
                                                     variant="filled" // Use filled for category maybe?
                                                     sx={{ mr: 1, bgcolor: 'grey.700', color: 'white' }} // Custom grey background
                                                 />
                                            </Box>
                                            <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'text.primary', mb: 0.5 }}>
                                                {issue.description}
                                            </Typography>
                                             <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                 <strong>Explanation:</strong> {issue.explanation}
                                             </Typography>
                                             {issue.suggestion && (
                                                 <Typography variant="body2" sx={{ color: 'info.main', mb: 1 }}>
                                                     <strong>Suggestion:</strong> {issue.suggestion}
                                                 </Typography>
                                             )}
                                             {issue.code_snippet && (
                                                <Box component="pre" sx={{
                                                    backgroundColor: '#2d2d2d',
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    overflowX: 'auto',
                                                    my: 1,
                                                    fontSize: '0.875rem',
                                                    color: '#f0f0f0',
                                                    whiteSpace: 'pre-wrap', // Allow wrapping
                                                    wordBreak: 'break-all' // Break long lines
                                                }}>
                                                    <code>
                                                        {issue.code_snippet}
                                                    </code>
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

    // --- Main Return ---
    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, color: 'text.primary' }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
                Codebase Analysis (Experimental - JSON Output)
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                This tool uses AI to scan repository files for potential quality issues. Analysis is based on code snippets and may require manual verification.
                Results are presented as structured JSON data. Ensure your GEMINI_API_KEY is configured on the server.
            </Typography>

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
                {loading ? (
                    <>
                        <span style={{ visibility: 'hidden' }}>Scanning...</span>
                        <CircularProgress
                            size={24}
                            sx={{
                                color: 'white',
                                position: 'absolute',
                                top: '50%', left: '50%',
                                marginTop: '-12px', marginLeft: '-12px',
                            }}
                        />
                    </>
                ) : (
                    'Scan Repository Code'
                )}
            </Button>

            {error && (
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}>
                    {error}
                </Alert>
            )}

            {/* Render structured data */}
            {analysisResult && (
                <>
                    {renderSummary()}
                    {renderDashboard()}
                    {renderIssueList()}
                </>
            )}

             {/* Render files with errors or skips separately for clarity */}
             {analysisResult?.fileAnalyses?.filter(f => f.status === 'error' || f.status === 'skipped').length > 0 && (
                  <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>
                          Files Not Fully Analyzed
                      </Typography>
                      {analysisResult.fileAnalyses.filter(f => f.status === 'error' || f.status === 'skipped').map(file => (
                          <Paper key={file.filePath} elevation={1} sx={{ p: 1.5, mb: 1, bgcolor: 'background.paper' }}>
                               <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                   <Chip
                                       icon={<ErrorOutlineIcon />}
                                       label={file.status.toUpperCase()}
                                       size="small"
                                       color={file.status === 'error' ? 'error' : 'warning'}
                                       variant="outlined"
                                       sx={{ mr: 1, fontWeight: 'medium' }}
                                   />
                                   <Typography variant="body2" component="span" sx={{ fontWeight: 'medium', color: 'text.primary', mr: 1, flexGrow: 1 }}>
                                       {file.filePath}
                                   </Typography>
                               </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                    Reason: {file.error_message || file.skip_reason}
                                </Typography>
                                {file.rawOutput && ( // Optional: Show raw output for debugging JSON errors
                                    <Tooltip title="Raw LLM Output (for debugging)">
                                        <Box component="pre" sx={{
                                            backgroundColor: '#2d2d2d', p: 1, borderRadius: 1, overflowX: 'auto',
                                            mt: 1, fontSize: '0.75rem', color: '#ccc', maxHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                        }}>
                                            <code>{file.rawOutput}</code>
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