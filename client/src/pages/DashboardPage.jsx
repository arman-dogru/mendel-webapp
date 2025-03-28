import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import BranchesComponent from "../components/GitTree/GitTreeComponent";

const DashboardPage = () => {
  const location = useLocation();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [activeTab, setActiveTab] = useState("Branches");

  useEffect(() => {
    if (location.state && location.state.repo) {
      setSelectedRepo(location.state.repo);
    }
  }, [location.state]);

  if (!selectedRepo) {
    return (
      <div className="min-h-screen dark-bg flex justify-center items-center">
        <div className="text-secondary">No repository selected.</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "Branches":
        return <BranchesComponent repo={selectedRepo} />;
      default:
        return <div>Select a tab to view content.</div>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <Navbar setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">
          {selectedRepo}
        </h2>
        {renderContent()}
      </main>
    </div>
  );
};

export default DashboardPage;
