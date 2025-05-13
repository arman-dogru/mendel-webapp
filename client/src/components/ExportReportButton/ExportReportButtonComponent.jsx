import React, { useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import {
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import Papa from "papaparse";

const ExportReportButton = ({ analysisResult, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const exportAsPDF = async () => {
    handleClose();
    setLoading(true);
    try {
      const doc = new jsPDF();

      // Add title and metadata
      const repoName = analysisResult?.repository || "Repository Analysis";
      const date = analysisResult?.scanTimestamp
        ? new Date(analysisResult.scanTimestamp).toLocaleString()
        : new Date().toLocaleString();

      // Add title
      doc.setFontSize(22);
      doc.setTextColor(255, 85, 85); // Using var(--button-bg) color
      doc.text("Code Analysis Report", 20, 20);

      // Add repo and scan info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Repository: ${repoName}`, 20, 30);
      doc.text(`Scan Date: ${date}`, 20, 37);
      doc.text(
        `Commit: ${
          analysisResult?.summary?.commitSha?.substring(0, 7) || "N/A"
        }`,
        20,
        44
      );
      doc.text(
        `Branch: ${
          analysisResult?.summary?.branchName ||
          analysisResult?.summary?.defaultBranch ||
          "N/A"
        }`,
        20,
        51
      );

      // Add summary
      const {
        filesAnalyzed = 0,
        filesSkipped = 0,
        filesErrored = 0,
      } = analysisResult?.summary || {};
      doc.setFontSize(16);
      doc.text("Scan Summary", 20, 65);
      doc.setFontSize(12);
      doc.text(`Files Analyzed: ${filesAnalyzed}`, 20, 75);
      doc.text(`Files Skipped: ${filesSkipped}`, 20, 82);
      doc.text(`Files with Errors: ${filesErrored}`, 20, 89);

      // Calculate issue statistics
      let totalIssues = 0;
      let issuesBySeverity = {};
      let issuesByCategory = {};

      analysisResult?.fileAnalyses?.forEach((file) => {
        if (file.status === "analyzed" && Array.isArray(file.issues)) {
          file.issues.forEach((issue) => {
            totalIssues++;

            if (issue.severity) {
              const severity =
                issue.severity.charAt(0).toUpperCase() +
                issue.severity.slice(1).toLowerCase();
              issuesBySeverity[severity] =
                (issuesBySeverity[severity] || 0) + 1;
            }

            if (issue.category) {
              issuesByCategory[issue.category] =
                (issuesByCategory[issue.category] || 0) + 1;
            }
          });
        }
      });

      // Add issues overview
      doc.setFontSize(16);
      doc.text("Issues Overview", 20, 105);
      doc.setFontSize(12);
      doc.text(`Total Issues: ${totalIssues}`, 20, 115);

      // Add severity breakdown
      let yPos = 130;
      doc.setFontSize(14);
      doc.text("Issues by Severity", 20, yPos);
      yPos += 10;

      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        doc.setFontSize(12);
        doc.text(`${severity}: ${count}`, 30, yPos);
        yPos += 7;
      });

      yPos += 5;

      // Add category breakdown
      doc.setFontSize(14);
      doc.text("Issues by Category", 20, yPos);
      yPos += 10;

      Object.entries(issuesByCategory).forEach(([category, count]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.text(`${category}: ${count}`, 30, yPos);
        yPos += 7;
      });

      // Add detailed issues
      yPos += 10;
      doc.setFontSize(16);
      doc.text("Detailed Issues", 20, yPos);
      yPos += 10;

      // Group issues by file
      analysisResult?.fileAnalyses?.forEach((file) => {
        if (
          file.status === "analyzed" &&
          Array.isArray(file.issues) &&
          file.issues.length > 0
        ) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(14);
          doc.setTextColor(255, 85, 85); // red for file headers
          doc.text(file.filePath, 20, yPos);
          yPos += 7;
          doc.setTextColor(0, 0, 0);

          file.issues.forEach((issue, index) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            // Add line info if available
            const lineInfo = issue.line ? `Line ${issue.line}: ` : "";
            doc.text(`${index + 1}. ${lineInfo}${issue.description}`, 25, yPos);
            yPos += 6;

            if (issue.severity) {
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`Severity: ${issue.severity}`, 30, yPos);
              yPos += 5;
            }

            if (issue.category) {
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`Category: ${issue.category}`, 30, yPos);
              yPos += 7;
            }
          });

          yPos += 5;
        }
      });

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      // Save the PDF
      doc.save(
        `${repoName.replace(/\//g, "-")}-code-analysis-${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
      alert("Failed to generate PDF report. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const exportAsCSV = () => {
    handleClose();
    setLoading(true);
    try {
      // Prepare data for CSV
      const rows = [];

      // Add header row
      rows.push([
        "File Path",
        "Line",
        "Description",
        "Category",
        "Severity",
        "Suggestion",
      ]);

      // Add data rows
      analysisResult?.fileAnalyses?.forEach((file) => {
        if (
          file.status === "analyzed" &&
          Array.isArray(file.issues) &&
          file.issues.length > 0
        ) {
          file.issues.forEach((issue) => {
            rows.push([
              file.filePath,
              issue.line || "",
              issue.description || "",
              issue.category || "",
              issue.severity || "",
              issue.suggestion || "",
            ]);
          });
        }
      });

      // Generate CSV
      const csv = Papa.unparse(rows);

      // Create download link
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      // Set filename
      const repoName = analysisResult?.repository || "repository";
      link.setAttribute(
        "download",
        `${repoName.replace(/\//g, "-")}-code-analysis-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate CSV report:", err);
      alert("Failed to generate CSV report. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleClick}
        disabled={disabled || loading || !analysisResult}
        startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
        sx={{
          ml: { xs: 0, sm: 2 },
          mb: { xs: 2, sm: 0 },
          mt: { xs: 2, sm: 0 },
          backgroundColor: "var(--button-bg)",
          "&:hover": { backgroundColor: "var(--button-hover-bg)" },
          position: "relative",
        }}
      >
        {loading ? "Exporting..." : "Export Report"}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "export-button",
        }}
      >
        <MenuItem onClick={exportAsPDF}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportAsCSV}>
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportReportButton;
