import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Issues from "../components/Issues/IssuesComponent";
import PRs from "../components/PRs/PRs";
import CodeAnalysisComponent from "../components/CodeAnalysis/CodeAnalysisComponent";
import { useRepo } from "../context/RepoContext";
import TeamsComponents from "../components/Teams/TeamsComponents";
import { Box, Typography } from "@mui/material";

const DashboardPage = () => {
  const { repoFullName } = useParams();
  const { selectedRepo, setSelectedRepo } = useRepo();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "Dashboards";
  const validTabs = ["Dashboards", "PRs", "Issues", "Analysis", "Teams"];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialTab) ? initialTab : "Dashboards"
  );

  const repo = repoFullName ? decodeURIComponent(repoFullName) : selectedRepo;

  useEffect(() => {
    if (repo && repo !== selectedRepo) {
      setSelectedRepo(repo);
    }
    if (!repo) {
      navigate("/homepage", { replace: true });
    }
  }, [repo, selectedRepo, setSelectedRepo, navigate]);

  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    if (currentParams.get("tab") !== activeTab) {
      currentParams.set("tab", activeTab);
      navigate(`${location.pathname}?${currentParams.toString()}`, {
        replace: true,
      });
    }
  }, [activeTab, location.pathname, location.search, navigate]);

  if (!repo) {
    return (
      <div className="min-h-screen dark-bg flex justify-center items-center">
        <div className="text-secondary">Loading repository context...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "Issues":
        return <Issues repo={repo} />;
      case "Analysis":
        return <CodeAnalysisComponent repo={repo} />;
      case "PRs":
        return <PRs repo={repo} />;
      case "Dashboards":
        return (
          <Box sx={{ p: 3 }} className="space-y-4 md:space-y-6">
            <Typography className="text-secondary">
              Dashboards content coming soon...
            </Typography>
          </Box>
        );
      case "Teams":
        return <TeamsComponents />;
      default:
        return (
          <Box sx={{ p: 3 }} className="space-y-4 md:space-y-6">
            <Typography className="text-secondary">
              Select a tab to view content.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <Navbar setActiveTab={setActiveTab} activeTab={activeTab} repo={repo} />
      <main className="flex-1 w-full mx-auto p-6 space-y-4 md:space-y-6">
        <h2 className="text-l md:text-2xl font-semibold mb-4 text-primary leading-[3.5rem]">
          {repo}
        </h2>
        {renderContent()}
      </main>
    </div>
  );
};

export default DashboardPage;
