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
  const commitListRef = useRef();

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
      "#ffeb3b",
      "#8bc34a",
      "#673ab7",
      "#00bcd4",
    ];

    branchList.forEach((branch, index) => {
      colors[branch.name] =
        branch.name === "main" || branch.name === "master"
          ? baseColors[0]
          : baseColors[(index % (baseColors.length - 1)) + 1];
    });
    return colors;
  };

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
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

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
    return merge ? merge.baseBranch : null;
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

  const scrollToCommit = (commitSha) => {
    if (commitListRef.current) {
      const commitElement = document.getElementById(`commit-${commitSha}`);
      if (commitElement) {
        commitElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

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

    const branchIndices = {};

    let mainBranchName = null;

    for (const branch of branches) {
      if (branch.name === "main" || branch.name === "master") {
        mainBranchName = branch.name;
        break;
      }
    }

    if (!mainBranchName && branches.length > 0) {
      mainBranchName = branches[0].name;
    }

    if (mainBranchName) {
      branchIndices[mainBranchName] = 0;
    }

    let branchIndex = 1;
    filteredBranches
      .filter((b) => b !== mainBranchName)
      .forEach((branch) => {
        branchIndices[branch] = branchIndex++;
      });

    const margin = { top: 40, right: 50, bottom: 20, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const laneSpacing = Math.min(Math.max(innerWidth / 6, 60), 100);
    const yStep = 50;
    const circleRadius = 8;
    const strokeWidth = 2;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const branchLanes = {};
    Object.entries(branchIndices).forEach(([branch, index]) => {
      branchLanes[branch] = index * laneSpacing;
    });

    const commitPositions = new Map();
    const commitYPositions = {};

    let currentY = 0;
    filteredCommits.forEach((commit, i) => {
      if (i > 0 && commit.date === filteredCommits[i - 1].date) {
        commitYPositions[commit.sha] =
          commitYPositions[filteredCommits[i - 1].sha];
      } else {
        commitYPositions[commit.sha] = currentY;
        currentY += yStep;
      }
    });

    filteredCommits.forEach((commit) => {
      let lane = branchLanes[commit.branch];
      if (lane === undefined && mainBranchName) {
        lane = branchLanes[mainBranchName];
      }
      if (lane === undefined) {
        lane = 0;
      }

      commitPositions.set(commit.sha, {
        x: lane,
        y: commitYPositions[commit.sha],
        commit,
      });
    });

    Object.entries(branchLanes).forEach(([branch, lane]) => {
      const branchCommits = filteredCommits.filter((c) => c.branch === branch);
      if (branchCommits.length > 0) {
        const minY = Math.min(
          ...branchCommits.map((c) => commitPositions.get(c.sha).y)
        );
        const maxY = Math.max(
          ...branchCommits.map((c) => commitPositions.get(c.sha).y)
        );

        g.append("line")
          .attr("x1", lane)
          .attr("y1", minY)
          .attr("x2", lane)
          .attr("y2", maxY)
          .attr("stroke", branchColors[branch] || "#555")
          .attr("stroke-width", 2)
          .attr("opacity", 0.5);
      }
    });

    filteredCommits.forEach((commit) => {
      const sourcePos = commitPositions.get(commit.sha);
      if (!sourcePos) return;

      commit.parents.forEach((parentSha) => {
        const targetPos = commitPositions.get(parentSha);
        if (!targetPos) return;

        const isMergeConnection =
          commit.parents.length > 1 &&
          sourcePos.commit.branch !== targetPos.commit.branch;

        if (isMergeConnection) {
          const midY = (sourcePos.y + targetPos.y) / 2;

          g.append("path")
            .attr(
              "d",
              `M${sourcePos.x},${sourcePos.y} 
                  C${sourcePos.x},${midY} 
                    ${targetPos.x},${midY} 
                    ${targetPos.x},${targetPos.y}`
            )
            .attr("fill", "none")
            .attr("stroke", branchColors[targetPos.commit.branch] || "#555")
            .attr("stroke-width", strokeWidth)
            .attr("stroke-dasharray", "5,5");
        } else if (sourcePos.x !== targetPos.x) {
          g.append("path")
            .attr(
              "d",
              `M${sourcePos.x},${sourcePos.y} 
                  L${targetPos.x},${sourcePos.y} 
                  L${targetPos.x},${targetPos.y}`
            )
            .attr("fill", "none")
            .attr("stroke", branchColors[sourcePos.commit.branch] || "#555")
            .attr("stroke-width", strokeWidth);
        } else {
          g.append("line")
            .attr("x1", sourcePos.x)
            .attr("y1", sourcePos.y)
            .attr("x2", targetPos.x)
            .attr("y2", targetPos.y)
            .attr("stroke", branchColors[sourcePos.commit.branch] || "#555")
            .attr("stroke-width", strokeWidth);
        }
      });
    });

    const nodes = g
      .selectAll(".node")
      .data(filteredCommits)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        const pos = commitPositions.get(d.sha);
        return `translate(${pos.x},${pos.y})`;
      })
      .on("mouseover", (_, d) => {
        setHoveredCommit(d.sha);
        scrollToCommit(d.sha);
      })
      .on("mouseout", () => setHoveredCommit(null))
      .on("click", (_, d) => scrollToCommit(d.sha));

    nodes
      .append("circle")
      .attr("r", (d) =>
        hoveredCommit === d.sha ? circleRadius * 1.4 : circleRadius
      )
      .attr("fill", (d) => {
        if (isMergeCommit(d)) return "transparent";
        return branchColors[d.branch] || "#555";
      })
      .attr("stroke", (d) => branchColors[d.branch] || "#555")
      .attr("stroke-width", strokeWidth)
      .attr("class", "commit-node");

    const branchLabels = g.append("g").attr("class", "branch-labels");

    Object.entries(branchLanes).forEach(([branch, lane]) => {
      branchLabels
        .append("text")
        .attr("x", lane)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("fill", branchColors[branch] || "#555")
        .style("font-weight", "bold")
        .text(branch);
    });

    nodes
      .filter((d) => hoveredCommit === d.sha)
      .append("g")
      .attr("class", "commit-tooltip")
      .call((g) => {
        g.append("rect")
          .attr("x", 15)
          .attr("y", -15)
          .attr("width", 200)
          .attr("height", 30)
          .attr("fill", "#3a3a3a")
          .attr("rx", 4);

        g.append("text")
          .attr("x", 25)
          .attr("y", 0)
          .attr("fill", "var(--text-primary)")
          .text((d) => truncateMessage(d.message, 25));
      });

    const containerHeight = Math.max(
      500,
      currentY + margin.top + margin.bottom
    );
    container.style.height = `${containerHeight}px`;

    return containerHeight;
  }, [
    filteredCommits,
    branches,
    filteredBranches,
    selectedBranch,
    hoveredCommit,
    branchColors,
  ]);

  useEffect(() => {
    if (!loading && commits.length) {
      const treeHeight = drawGitTree();
      const handleResize = () => drawGitTree();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [loading, commits, drawGitTree]);

  useEffect(() => {
    if (hoveredCommit) {
      scrollToCommit(hoveredCommit);
    }
  }, [hoveredCommit]);

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
            <div
              key={branch}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700"
            >
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
          className="w-full lg:w-1/2 border border-gray-600 rounded bg-cardBg p-4 flex flex-col"
        >
          <h2 className="text-lg font-semibold mb-2">Git Tree Visualization</h2>
          <div className="flex-1 overflow-auto">
            <svg ref={svgRef} className="w-full min-h-full"></svg>
          </div>
        </div>

        <div className="w-full lg:w-1/2 h-[60vh] lg:h-auto border border-gray-600 rounded bg-cardBg p-4 flex flex-col overflow-hidden">
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
          <div ref={commitListRef} className="flex-1 overflow-auto">
            {filteredCommits.map((commit) => {
              const pr = isMergeCommit(commit)
                ? findPrForMerge(commit.sha)
                : null;
              return (
                <div
                  id={`commit-${commit.sha}`}
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
