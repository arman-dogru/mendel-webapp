import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useParams } from "react-router-dom";
import { getRepoContributors } from "../../utils/api";
import "./TeamComponents.css";

const TeamsComponents = () => {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { repoFullName } = useParams();

  useEffect(() => {
    const fetchContributors = async () => {
      if (!repoFullName) return;

      try {
        setLoading(true);
        const [owner, repo] = repoFullName.split("/");
        const data = await getRepoContributors(owner, repo);
        setContributors(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching contributors:", err);
        setError("Failed to load contributors data");
        setLoading(false);

        setContributors([
          { name: "Jane Doe", email: "jane@example.com", totalPRs: 23 },
          { name: "John Smith", email: "john@github.com", totalPRs: 17 },
          { name: "Alex Johnson", email: "alex@dev.com", totalPRs: 8 },
          { name: "Sam Wilson", email: "sam@coder.net", totalPRs: 12 },
        ]);
      }
    };

    fetchContributors();
  }, [repoFullName]);

  const handleViewDetails = (contributor) => {
    console.log("Viewing details for:", contributor.name);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
        {error} - Please try again later.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 card-bg rounded-lg shadow-lg">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-primary">
        Repository Contributors
      </h2>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <table className="w-full border-collapse min-w-full table-auto">
          <thead>
            <tr className="bg-cardBg border-b border-gray-700">
              <th className="p-2 md:p-3 text-left text-primary font-medium">
                Name
              </th>
              <th className="p-2 md:p-3 text-left text-primary font-medium hidden sm:table-cell">
                Email
              </th>
              <th className="p-2 md:p-3 text-left text-primary font-medium">
                Total PRs
              </th>
              <th className="p-2 md:p-3 text-left text-primary font-medium hidden md:table-cell">
                Column 1
              </th>
              <th className="p-2 md:p-3 text-left text-primary font-medium hidden lg:table-cell">
                Column 2
              </th>
              <th className="p-2 md:p-3 text-center text-primary font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((contributor, index) => (
              <tr
                key={index}
                className="border-b border-gray-700 hover:bg-card-bg-hover transition-colors duration-150"
              >
                <td className="p-2 md:p-3 text-primary">{contributor.name}</td>
                <td className="p-2 md:p-3 text-primary hidden sm:table-cell text-sm">
                  {contributor.email}
                </td>
                <td className="p-2 md:p-3 text-primary">
                  {contributor.totalPRs}
                </td>
                <td className="p-2 md:p-3 text-primary hidden md:table-cell"></td>
                <td className="p-2 md:p-3 text-primary hidden lg:table-cell"></td>
                <td className="p-2 md:p-3 text-center">
                  <button
                    onClick={() => handleViewDetails(contributor)}
                    className="p-1 rounded hover:bg-gray-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contributors.length === 0 && (
        <div className="text-center p-6 md:p-8 text-secondary bg-cardBg rounded-lg mt-4">
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 mb-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="text-lg">
              No contributors found for this repository.
            </p>
          </div>
        </div>
      )}

      <div className="sm:hidden mt-4">
        <h3 className="text-lg font-medium text-primary mb-2">Contributors</h3>
        {contributors.map((contributor, index) => (
          <div
            key={index}
            className="bg-cardBg mb-3 p-3 rounded-lg border border-gray-700 shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-primary font-medium">{contributor.name}</h4>
              <button
                onClick={() => handleViewDetails(contributor)}
                className="p-1 rounded hover:bg-gray-600 transition-colors"
                title="View Details"
              >
                <Eye className="h-4 w-4 text-primary" />
              </button>
            </div>
            <div className="text-sm text-secondary mb-1">
              {contributor.email}
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-primary">PRs:</span>
              <span className="font-medium text-primary">
                {contributor.totalPRs}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamsComponents;
