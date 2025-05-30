import React, { useState } from "react";
import { jsPDF } from "jspdf";
import Papa from "papaparse";

const ExportReportButton = ({ analysisResult, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    if (!disabled) setDropdownOpen((prev) => !prev);
  };

  const closeDropdown = () => setDropdownOpen(false);

  const exportAsPDF = async () => {
    closeDropdown();
    setLoading(true);
    try {
      const doc = new jsPDF();
      const repoName = analysisResult?.repository || "Repository Analysis";
      const date = analysisResult?.scanTimestamp
        ? new Date(analysisResult.scanTimestamp).toLocaleString()
        : new Date().toLocaleString();

      doc.setFontSize(22);
      doc.setTextColor(255, 85, 85);
      doc.text("Code Analysis Report", 20, 20);

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

      let totalIssues = 0;
      let issuesBySeverity = {};
      let issuesByCategory = {};
      analysisResult?.fileAnalyses?.forEach((file) => {
        if (file.status === "analyzed" && Array.isArray(file.issues)) {
          file.issues.forEach((issue) => {
            totalIssues++;
            if (issue.severity) {
              const sev =
                issue.severity[0].toUpperCase() +
                issue.severity.slice(1).toLowerCase();
              issuesBySeverity[sev] = (issuesBySeverity[sev] || 0) + 1;
            }
            if (issue.category) {
              issuesByCategory[issue.category] =
                (issuesByCategory[issue.category] || 0) + 1;
            }
          });
        }
      });

      doc.setFontSize(16);
      doc.text("Issues Overview", 20, 105);
      doc.setFontSize(12);
      doc.text(`Total Issues: ${totalIssues}`, 20, 115);

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
      doc.setFontSize(14);
      doc.text("Issues by Category", 20, yPos);
      yPos += 10;
      Object.entries(issuesByCategory).forEach(([cat, count]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.text(`${cat}: ${count}`, 30, yPos);
        yPos += 7;
      });

      yPos += 10;
      doc.setFontSize(16);
      doc.text("Detailed Issues", 20, yPos);
      yPos += 10;

      analysisResult?.fileAnalyses?.forEach((file) => {
        if (file.status === "analyzed" && file.issues?.length > 0) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(14);
          doc.setTextColor(255, 85, 85);
          doc.text(file.filePath, 20, yPos);
          yPos += 7;
          doc.setTextColor(0, 0, 0);

          file.issues.forEach((issue, i) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.setFontSize(11);
            const line = issue.line ? `Line ${issue.line}: ` : "";
            doc.text(`${i + 1}. ${line}${issue.description}`, 25, yPos);
            yPos += 6;
            if (issue.severity) {
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`Severity: ${issue.severity}`, 30, yPos);
              yPos += 5;
            }
            if (issue.category) {
              doc.text(`Category: ${issue.category}`, 30, yPos);
              yPos += 7;
            }
          });
          yPos += 5;
        }
      });

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

      doc.save(
        `${repoName.replace(/\//g, "-")}-code-analysis-${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );
    } catch (err) {
      console.error("PDF error:", err);
      alert("Failed to export PDF.");
    } finally {
      setLoading(false);
    }
  };

  const exportAsCSV = () => {
    closeDropdown();
    setLoading(true);
    try {
      const rows = [
        [
          "File Path",
          "Line",
          "Description",
          "Category",
          "Severity",
          "Suggestion",
        ],
      ];
      analysisResult?.fileAnalyses?.forEach((file) => {
        if (file.status === "analyzed" && Array.isArray(file.issues)) {
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

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(analysisResult?.repository || "repository").replace(
        /\//g,
        "-"
      )}-code-analysis-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV error:", err);
      alert("Failed to export CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleDropdown}
        disabled={disabled || loading || !analysisResult}
        className={`
          px-4 py-2 rounded text-black font-semibold 
          bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] 
          disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
        `}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        )}
        {loading ? "Exporting..." : "Export Report"}
      </button>

      {dropdownOpen && (
        <div
          className="absolute z-10 mt-2 w-48 rounded shadow-lg bg-white border border-border text-sm text-black"
          onMouseLeave={closeDropdown}
        >
          <div
            onClick={exportAsPDF}
            className="px-4 py-2 hover:bg-[var(--button-hover-bg)] cursor-pointer"
          >
            📄 Export as PDF
          </div>
          <div
            onClick={exportAsCSV}
            className="px-4 py-2 hover:bg-[var(--button-hover-bg)] cursor-pointer"
          >
            📄 Export as CSV
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportReportButton;
