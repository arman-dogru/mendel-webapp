import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import UserContributionBoxes from "../components/UserContibutionMetrix/UserContibutionBoxes";
import UserContributionGraph from "../components/UserContibutionMetrix/UserContibutionGraphs";
import Loader from "../components/Loader/Loader";

const UserProfilePage = () => {
  const { owner, repo, contributor } = useParams();
  const navigate = useNavigate();

  if (!owner || !repo || !contributor) {
    navigate("/homepage", { replace: true });
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <Navbar
        setActiveTab={() => {}}
        activeTab="Profile"
        repo={`${owner}/${repo}`}
      />
      <main className="flex-1 w-full mx-auto p-6 space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 text-primary leading-[3.5rem]">
          {contributor}'s Profile - {owner}/{repo}
        </h2>
        <UserContributionBoxes />
        <UserContributionGraph />
      </main>
    </div>
  );
};

export default UserProfilePage;
