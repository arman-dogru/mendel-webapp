"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import "./GitTreeComponent.css";
import {
  getRepoBranches,
  getRepoCommits,
  getRepoMerges,
} from "../../utils/api";
import { handleApiError } from "../../utils/errorHandler";

const GitTreeComponent = ({ repo }) => {
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [merges, setMerges] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [hoveredCommit, setHoveredCommit] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("All branches");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const svgRef = useRef();
  const containerRef = useRef();

  // Generate branch colors
  const generateBranchColors = (branchList) => {
    const colors = {};
    const baseColors = [
      "#2196f3",
      "#e91e63",
      "#4caf50",
      "#ff9800",
      "#9c27b0",
      "#795548",
      "#607d8b",
      "#ff5722",
      "#3f51b5",
      "#009688",
    ];
    branchList.forEach((branch, index) => {
      colors[branch.name] =
        branch.name === "main"
          ? baseColors[0]
          : baseColors[(index % (baseColors.length - 1)) + 1];
    });
    return colors;
  };

  // Fetch repository data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [owner, repoName] = repo.split("/");
        const branchesData = await getRepoBranches(owner, repoName);
        setBranches(branchesData);

        const commitPromises = branchesData.map((branch) =>
          getRepoCommits(owner, repoName, branch.name)
        );
        const commitsDataArray = await Promise.all(commitPromises);
        const uniqueCommits = Array.from(
          new Map(commitsDataArray.flat().map((c) => [c.sha, c])).values()
        );
        setCommits(uniqueCommits);

        const mergesData = await getRepoMerges(owner, repoName);
        setMerges(mergesData);
        setFilteredBranches(branchesData.map((b) => b.name));
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    if (repo) fetchData();
  }, [repo]);

  const branchColors = generateBranchColors(branches);
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const getBaseBranch = (branchName) => {
    const merge = merges.find((m) => m.headBranch === branchName);
    return merge ? merge.baseBranch : "main";
  };

  const getFilteredCommits = () => {
    if (selectedBranch === "All branches") return sortedCommits;
    const baseBranch = getBaseBranch(selectedBranch);
    return sortedCommits.filter(
      (commit) =>
        filteredBranches.includes(commit.branch) ||
        (baseBranch && commit.branch === baseBranch)
    );
  };

  const filteredCommits = getFilteredCommits();

  const selectBranch = (event) => {
    const branchName = event.target.value;
    setSelectedBranch(branchName);
    const baseBranch =
      branchName !== "All branches" ? getBaseBranch(branchName) : null;
    setFilteredBranches(
      branchName === "All branches"
        ? branches.map((b) => b.name)
        : [branchName, ...(baseBranch ? [baseBranch] : [])]
    );
  };

  const isMergeCommit = (commit) => commit.parents.length > 1;
  const findPrForMerge = (commitSha) =>
    merges.find((merge) => merge.mergeCommitSha === commitSha);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const truncateSha = (sha) => sha.substring(0, 7);
  const truncateMessage = (message, maxLength = 15) =>
    message.length > maxLength
      ? `${message.substring(0, maxLength)}...`
      : message;

  const drawGitTree = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.max(
      container.clientHeight,
      filteredCommits.length * 60
    );

    svg.attr("width", width).attr("height", height);

    if (!filteredCommits.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", 50)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-primary)")
        .text("No commits to display");
      return;
    }

    const visibleBranches =
      selectedBranch === "All branches"
        ? branches
        : branches
            .filter((b) => filteredBranches.includes(b.name))
            .sort((a, b) => {
              if (a.name === "main") return -1;
              if (b.name === "main") return 1;
              if (a.name === selectedBranch) return -1;
              if (b.name === selectedBranch) return 1;
              return 0;
            });

    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    const laneWidth = Math.max(
      (width - margin.left - margin.right) /
        Math.max(visibleBranches.length, 1),
      60
    );
    const yStep = 60;
    const fontSize = Math.max(12, Math.min(14, width / 80));
    const circleRadius = Math.max(6, Math.min(10, width / 100));
    const strokeWidth = Math.max(1, width / 400);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const branchLanes = {};
    visibleBranches.forEach((branch, i) => {
      branchLanes[branch.name] = i * laneWidth + laneWidth / 2;
    });

    const commitPositions = new Map();
    const mergeCommits = new Map();

    filteredCommits.forEach((commit, index) => {
      const lane =
        branchLanes[commit.branch] || branchLanes["main"] || laneWidth / 2;
      commitPositions.set(commit.sha, {
        x: lane,
        y: index * yStep,
        commit,
      });

      if (isMergeCommit(commit)) {
        mergeCommits.set(commit.sha, {
          commit,
          parents: commit.parents.map((parentSha) => ({
            sha: parentSha,
            branch: filteredCommits.find((c) => c.sha === parentSha)?.branch,
          })),
        });
      }
    });

    // Draw branch labels
    g.selectAll(".branch-label")
      .data(visibleBranches)
      .enter()
      .append("text")
      .attr("x", (d) => branchLanes[d.name])
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => branchColors[d.name])
      .style("font-size", `${fontSize}px`)
      .style("font-weight", "bold")
      .text((d) => d.name);

    // Draw paths
    g.selectAll(".link")
      .data(filteredCommits.filter((c) => c.parents.length > 0))
      .enter()
      .append("path")
      .attr("d", (d) => {
        const targetPos = commitPositions.get(d.sha);
        if (!targetPos) return "";
        let path = "";
        d.parents.forEach((parentSha) => {
          const parentPos = commitPositions.get(parentSha);
          if (parentPos) {
            const parentBranch = filteredCommits.find(
              (c) => c.sha === parentSha
            )?.branch;
            if (isMergeCommit(d) && parentBranch !== d.branch) {
              path += `M${targetPos.x},${targetPos.y} V${
                (targetPos.y + parentPos.y) / 2
              } H${parentPos.x} V${parentPos.y}`;
            } else {
              path += `M${targetPos.x},${targetPos.y} V${parentPos.y}`;
            }
          }
        });
        return path;
      })
      .attr("fill", "none")
      .attr("stroke", (d) => branchColors[d.branch] || "#555")
      .attr("stroke-width", strokeWidth)
      .attr("stroke-dasharray", (d) => (isMergeCommit(d) ? "5,5" : null));

    // Draw nodes
    const nodes = g
      .selectAll(".node")
      .data(filteredCommits)
      .enter()
      .append("g")
      .attr(
        "transform",
        (d) =>
          `translate(${commitPositions.get(d.sha).x},${
            commitPositions.get(d.sha).y
          })`
      )
      .on("mouseover", (_, d) => setHoveredCommit(d.sha))
      .on("mouseout", () => setHoveredCommit(null));

    nodes
      .append("circle")
      .attr("r", (d) =>
        hoveredCommit === d.sha ? circleRadius * 1.4 : circleRadius
      )
      .attr("fill", (d) => (isMergeCommit(d) ? "none" : branchColors[d.branch]))
      .attr("stroke", (d) => branchColors[d.branch])
      .attr("stroke-width", strokeWidth);

    nodes
      .append("text")
      .attr("dx", circleRadius * 2)
      .attr("dy", ".35em")
      .attr("fill", "var(--text-primary)")
      .style("font-size", `${fontSize}px`)
      .text((d) =>
        isMergeCommit(d)
          ? "Merge"
          : truncateMessage(d.message, Math.floor(width / 40))
      );
  }, [
    filteredCommits,
    branches,
    filteredBranches,
    selectedBranch,
    hoveredCommit,
    branchColors,
  ]);

  // Handle resize and redraw
  useEffect(() => {
    if (!loading && commits.length) {
      drawGitTree();
      const handleResize = () => drawGitTree();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [loading, commits, drawGitTree]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-darkBg text-textPrimary">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
        <p className="mt-4">Loading repository data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-darkBg text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-darkBg text-textPrimary font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-cardBg border-b border-gray-600 flex-wrap gap-4">
        <select
          value={selectedBranch}
          onChange={selectBranch}
          className="w-full sm:w-auto min-w-[200px] p-2 bg-gray-700 text-textPrimary rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All branches">All Branches</option>
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Legend:</span>
          {filteredBranches.map((branch) => (
            <div key={branch} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: branchColors[branch] }}
              />
              <span>{branch}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full lg:w-1/2 h-[50vh] lg:h-auto border border-gray-600 rounded bg-cardBg p-4 flex flex-col"
        >
          <h2 className="text-lg font-semibold mb-2">Tree Visualization</h2>
          <div className="flex-1 overflow-auto">
            <svg ref={svgRef} className="w-full min-h-full"></svg>
          </div>
        </div>

        <div className="w-full lg:w-1/2 h-[50vh] lg:h-auto border border-gray-600 rounded bg-cardBg p-4 flex flex-col overflow-hidden">
          <h2 className="text-lg font-semibold mb-2">Commit History</h2>
          <div className="flex p-2 bg-gray-700 border-b border-gray-600 font-medium text-sm">
            <span className="flex-1 min-w-0 px-2">Description</span>
            <span className="hidden sm:block flex-[0.5] min-w-[80px] px-2">
              Date
            </span>
            <span className="hidden md:block flex-[0.5] min-w-[80px] px-2">
              Author
            </span>
            <span className="flex-[0.5] min-w-[60px] px-2">Commit</span>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredCommits.map((commit) => {
              const pr = isMergeCommit(commit)
                ? findPrForMerge(commit.sha)
                : null;
              return (
                <div
                  key={commit.sha}
                  className={`flex p-2 border-b border-gray-600 hover:bg-gray-600 text-sm ${
                    hoveredCommit === commit.sha ? "bg-gray-600" : ""
                  }`}
                  onMouseEnter={() => setHoveredCommit(commit.sha)}
                  onMouseLeave={() => setHoveredCommit(null)}
                >
                  <div className="flex-1 min-w-0 px-2 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 flex-shrink-0 rounded-full ${
                        isMergeCommit(commit) ? "border-2" : ""
                      }`}
                      style={{
                        backgroundColor: isMergeCommit(commit)
                          ? "transparent"
                          : branchColors[commit.branch],
                        borderColor: branchColors[commit.branch],
                      }}
                    />
                    <span className="truncate">
                      {pr ? `${pr.title} (PR #${pr.prNumber})` : commit.message}
                    </span>
                    {isMergeCommit(commit) && (
                      <span className="ml-1 px-1 py-0.5 bg-gray-600 rounded text-xs">
                        Merge
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block flex-[0.5] min-w-[80px] px-2 text-textSecondary truncate">
                    {formatDate(commit.date)}
                  </span>
                  <span className="hidden md:block flex-[0.5] min-w-[80px] px-2 text-textSecondary truncate">
                    {commit.author}
                  </span>
                  <span className="flex-[0.5] min-w-[60px] px-2 font-mono text-textSecondary">
                    {truncateSha(commit.sha)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitTreeComponent;
