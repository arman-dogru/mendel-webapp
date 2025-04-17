// src/components/CodeAnalysis/CodeAnalysisComponent.jsx

import React, { useState } from 'react';
import { Button, CircularProgress, Alert, Box, Paper, Typography, Link } from '@mui/material'; // Added Link
import ReactMarkdown from 'react-markdown';
import { scanRepository } from '../../utils/api'; // Adjust path as needed

const CodeAnalysisComponent = ({ repo }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

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
        setReport(null);

        try {
            const result = await scanRepository(owner, repoName);
            setReport(result.report);
        } catch (err) {
            console.error("Scan failed:", err);
            setError(err.message || 'Failed to scan repository. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use theme colors directly for better consistency
        <Box sx={{ p: 2, color: 'text.primary' }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
                Codebase Analysis (Experimental)
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                This tool uses the Gemini AI to scan your repository's code files, identify potential issues, and generate an overall report.
                The process can take several minutes for larger repositories. Analysis is limited to a subset of files and may not be exhaustive.
                Ensure your GEMINI_API_KEY is configured on the server.
            </Typography>


            <Button
                variant="contained"
                onClick={handleScan}
                disabled={loading}
                sx={{
                    mb: 3,
                    backgroundColor: '#EF4444', // Keep button color explicit or use theme.palette.error.main
                    '&:hover': { backgroundColor: '#DC2626' }, // Darker red on hover
                    position: 'relative',
                    color: '#ffffff', // Ensure button text is white
                }}
            >
                {loading ? (
                    <>
                        {/* Hide text when loading, spinner is enough */}
                        <span style={{ visibility: 'hidden' }}>Scanning...</span>
                        <CircularProgress
                            size={24}
                            sx={{
                                color: 'white',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                            }}
                        />
                    </>
                ) : (
                    'Scan Repository Code'
                )}
            </Button>

            {error && (
                // Ensure Alert text is readable
                <Alert severity="error" sx={{ mb: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}>
                    {error}
                </Alert>
            )}

            {report && (
                // Ensure Paper background and default text color work well
                 <Paper elevation={3} sx={{
                     p: { xs: 2, sm: 3 }, // Responsive padding
                     mt: 2,
                     backgroundColor: 'background.paper', // Use theme's paper color (should be dark in dark mode)
                     color: 'text.secondary' // Default text color within the paper
                  }}>
                    <ReactMarkdown
                        components={{ // Customize rendering with visible colors
                            h1: ({ node, ...props }) => <Typography variant="h4" gutterBottom {...props} sx={{ color: 'text.primary', mt: 3, mb: 1 }} />,
                            h2: ({ node, ...props }) => <Typography variant="h5" gutterBottom {...props} sx={{ color: 'text.primary', mt: 2.5, mb: 1 }} />,
                            h3: ({ node, ...props }) => <Typography variant="h6" gutterBottom {...props} sx={{ color: 'text.primary', mt: 2, mb: 0.5 }} />,
                            h4: ({ node, ...props }) => <Typography variant="subtitle1" gutterBottom {...props} sx={{ color: 'text.primary', mt: 1.5, mb: 0.5, fontWeight: 'bold' }} />,
                            h5: ({ node, ...props }) => <Typography variant="subtitle2" gutterBottom {...props} sx={{ color: 'text.primary', mt: 1, mb: 0.5, fontWeight: 'bold' }} />,
                            h6: ({ node, ...props }) => <Typography variant="caption" display="block" gutterBottom {...props} sx={{ color: 'text.primary', mt: 1, mb: 0.5, fontWeight: 'bold' }} />,
                            p: ({ node, ...props }) => <Typography variant="body1" paragraph {...props} sx={{ color: 'text.secondary', mb: 1.5 }} />, // Ensure paragraph spacing and color
                             ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', color: 'text.secondary' }} {...props} />, // Adjust padding if needed
                             ol: ({ node, ...props }) => <ol style={{ paddingLeft: '20px', color: 'text.secondary' }} {...props} />,
                             li: ({ node, ...props }) => (
                                 <li style={{ marginBottom: '0.5em' }}>
                                     {/* Wrap li content in Typography for consistent styling */}
                                     <Typography component="span" variant="body1" sx={{ color: 'text.secondary' }}>
                                         {props.children}
                                     </Typography>
                                 </li>
                             ),
                             code: ({ node, inline, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeContent = String(children).replace(/\n$/, ''); // Trim trailing newline

                                return !inline ? (
                                    <Box component="pre" sx={{
                                        backgroundColor: '#2d2d2d', // Slightly different dark shade
                                        p: 1.5,
                                        borderRadius: 1,
                                        overflowX: 'auto',
                                        my: 1.5,
                                        fontSize: '0.875rem', // Slightly smaller code font
                                        color: '#f0f0f0' // Light color for code text
                                    }}>
                                        <code>
                                            {codeContent}
                                        </code>
                                    </Box>
                                ) : (
                                    <code
                                        style={{
                                            background: '#444', // Darker gray for inline code
                                            color: '#e0e0e0', // Light text for inline code
                                            padding: '0.2em 0.4em',
                                            borderRadius: '3px',
                                            fontSize: '0.875rem'
                                        }}
                                        {...props}
                                    >
                                        {codeContent}
                                    </code>
                                );
                            },
                            blockquote: ({ node, ...props }) => <Box component="blockquote" sx={{ borderLeft: '4px solid #555', pl: 2, my: 1.5, fontStyle: 'italic', color: 'text.disabled' }} {...props} />, // Use disabled color for quote
                            a: ({ node, ...props }) => <Link {...props} sx={{ color: 'primary.main' }} target="_blank" rel="noopener noreferrer" />, // Make links use theme primary color and open in new tab
                             hr: ({node, ...props}) => <hr style={{ borderColor: '#444', margin: '1em 0' }} {...props} /> // Style horizontal rules
                        }}
                    >
                        {report}
                    </ReactMarkdown>
                </Paper>
            )}
        </Box>
    );
};

export default CodeAnalysisComponent;