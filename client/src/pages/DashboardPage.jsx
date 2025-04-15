import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import GitTreeComponent from "../components/GitTree/GitTreeComponent";
import Issues from "../components/Issues/IssuesComponent";
import PRs from "../components/PRs/PRs";
import { useRepo } from "../context/RepoContext";

const DashboardPage = () => {
  const { repoFullName } = useParams();
  const { selectedRepo, setSelectedRepo } = useRepo();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "Branches";
  const [activeTab, setActiveTab] = useState(initialTab);

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
    const queryParams = new URLSearchParams(location.search);
    queryParams.set("tab", activeTab);
    navigate(`${location.pathname}?${queryParams.toString()}`, {
      replace: true,
    });
  }, [activeTab, navigate, location.pathname, location.search]);

  if (!repo) {
    return (
      <div className="min-h-screen dark-bg flex justify-center items-center">
        <div className="text-secondary">No repository selected.</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "Branches":
        return <GitTreeComponent repo={repo} />;
      case "Issues":
        return <Issues repo={repo} />;
      case "PRs":
        return <PRs repo={repo} />;
      case "Dashboards":
        return <div>Dashboards content coming soon...</div>;
      default:
        return <div>Select a tab to view content.</div>;
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
