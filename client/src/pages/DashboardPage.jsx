import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import GitTreeComponent from "../components/GitTree/GitTreeComponent";
import { useRepo } from "../context/RepoContext";

const DashboardPage = () => {
  const { repoFullName } = useParams();
  const { selectedRepo, setSelectedRepo } = useRepo();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Branches");

  const repo = repoFullName ? decodeURIComponent(repoFullName) : selectedRepo;

  useEffect(() => {
    if (repo && repo !== selectedRepo) {
      setSelectedRepo(repo);
    }
    if (!repo) {
      navigate("/homepage", { replace: true });
    }
  }, [repo, selectedRepo, setSelectedRepo, navigate]);

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
      default:
        return <div>Select a tab to view content.</div>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <Navbar setActiveTab={setActiveTab} activeTab={activeTab} />
      <main className="flex-1 max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">{repo}</h2>
        {renderContent()}
      </main>
    </div>
  );
};

export default DashboardPage;
