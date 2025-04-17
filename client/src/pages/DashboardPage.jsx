// pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import GitTreeComponent from "../components/GitTree/GitTreeComponent";
import Issues from "../components/Issues/IssuesComponent";
import PRs from "../components/PRs/PRs";
import CodeAnalysisComponent from "../components/CodeAnalysis/CodeAnalysisComponent"; // Import the new component
import { useRepo } from "../context/RepoContext";
import { Box, Typography } from '@mui/material'; // For placeholder content

const DashboardPage = () => {
  const { repoFullName } = useParams();
  const { selectedRepo, setSelectedRepo } = useRepo();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  // Default to 'Branches' if no tab or invalid tab is specified
  const initialTab = queryParams.get("tab") || "Branches";
  const validTabs = ["Dashboards", "Branches", "PRs", "Issues", "Analysis"];
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab) ? initialTab : "Branches");

  const repo = repoFullName ? decodeURIComponent(repoFullName) : selectedRepo;

  useEffect(() => {
    if (repo && repo !== selectedRepo) {
      setSelectedRepo(repo);
    }
    if (!repo) {
      // Redirect if no repo context is available (e.g., direct navigation)
      navigate("/homepage", { replace: true });
    }
  }, [repo, selectedRepo, setSelectedRepo, navigate]);

  // Update URL when activeTab changes internally (e.g. default setting)
  // Or when navigating back/forward causing tab state to change
   useEffect(() => {
       const currentParams = new URLSearchParams(location.search);
       if (currentParams.get('tab') !== activeTab) {
            currentParams.set("tab", activeTab);
            navigate(`${location.pathname}?${currentParams.toString()}`, { replace: true });
       }
   }, [activeTab, location.pathname, location.search, navigate]);


  if (!repo) {
    // This might briefly show while redirecting
    return (
      <div className="min-h-screen dark-bg flex justify-center items-center">
        <div className="text-secondary">Loading repository context...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "Branches":
        return <GitTreeComponent repo={repo} />;
      case "Issues":
        return <Issues repo={repo} />;
      case "Analysis": // Add case for Analysis
        return <CodeAnalysisComponent repo={repo} />;
      case "PRs":
        return <PRs repo={repo} />;
      case "Dashboards":
        return <Box sx={{ p: 3 }}><Typography sx={{color: 'text.secondary'}}>Dashboards content coming soon...</Typography></Box>;
      default:
        // Should not happen due to initial state logic, but good fallback
        return <Box sx={{ p: 3 }}><Typography sx={{color: 'text.secondary'}}>Select a tab to view content.</Typography></Box>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <Navbar setActiveTab={setActiveTab} activeTab={activeTab} repo={repo} />
      <main className="flex-1 w-full  mx-auto p-6">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">{repo}</h2>
        {renderContent()}
      </main>
    </div>
  );
};

export default DashboardPage;