import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { dagStratify, sugiyama } from "d3-dag";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MergeIcon from "@mui/icons-material/Merge";
import CommitIcon from "@mui/icons-material/Commit";
import { getGitTree } from "../../utils/api";

const branchColors = [
  "#FF5555",
  "#55AAFF",
  "#55FF55",
  "#AA55FF",
  "#FFAA00",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
];

const generateRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const TreeContainer = styled(Box)({
  border: "1px solid #333",
  borderRadius: "4px",
  backgroundColor: "#1F1F1F",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
});

const CommitListContainer = styled(Box)({
  border: "1px solid #333",
  borderRadius: "4px",
  backgroundColor: "#1F1F1F",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
});

const LoadingContainer = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100%",
  flexDirection: "column",
  gap: "16px",
});

const GitTreeComponent = ({ repo }) => {
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [highlightedCommit, setHighlightedCommit] = useState(null);
  const [treeHeight, setTreeHeight] = useState(0);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [owner, repoName] = repo.split("/");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getGitTree(owner, repoName);
        console.log("Git Tree API Response:", response);

        const { branches: fetchedBranches, commits: fetchedCommits } = response;
        const branchesWithColors = fetchedBranches.map((branch, index) => ({
          ...branch,
          color:
            index < branchColors.length
              ? branchColors[index]
              : generateRandomColor(),
        }));

        setBranches(branchesWithColors);
        setCommits(
          fetchedCommits.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          )
        );

        if (fetchedCommits.length === 0) {
          setError("No commits found for this repository.");
        }
      } catch (err) {
        if (err.response && err.response.status === 403) {
          setError("API rate limit exceeded. Please try again later.");
        } else if (err.response && err.response.status === 401) {
          setError(
            "Unauthorized. Please log in again to access this repository."
          );
        } else {
          setError("Failed to fetch data for Git-Tree. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [owner, repoName]);

  useEffect(() => {
    if (loading || error || commits.length === 0) return;

    const nodes = commits.map((commit) => ({
      id: commit.id,
      data: commit,
    }));

    const nodeIds = new Set(commits.map((commit) => commit.id));

    let dag;
    try {
      dag = dagStratify()(
        nodes.map((node) => ({
          id: node.id,
          parentIds: [node.data.parent, node.data.mergeParent].filter(
            (parentId) => parentId && nodeIds.has(parentId)
          ),
        }))
      );
    } catch (err) {
      setError(
        "Failed to create Git-Tree visualization: Incomplete commit history."
      );
      return;
    }

    const containerWidth = containerRef.current
      ? containerRef.current.getBoundingClientRect().width
      : 300;
    const containerHeight = containerRef.current
      ? containerRef.current.getBoundingClientRect().height
      : 300;

    const width = 800;
    const yStep = 60;
    const height = commits.length * yStep + 100;

    const layout = sugiyama()
      .size([height, width])
      .layering("longestPath")
      .decross("opt")
      .coord("greedy");

    try {
      layout(dag);
    } catch (err) {
      setError(
        "Failed to layout Git-Tree visualization: Incomplete commit history."
      );
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const scale = Math.min(
      containerWidth / (width + 100),
      containerHeight / (height + 100)
    );
    svg
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + 100} ${height + 100}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
      .append("g")
      .attr("transform", `translate(50, 50) scale(${scale})`);

    setTreeHeight(height * scale);

    const branchLanes = {};
    branches.forEach((branch, i) => {
      branchLanes[branch.name] = i * 60;
    });

    const commitPositions = new Map();
    dag.descendants().forEach((node, index) => {
      const commit = node.data;
      let lane;

      if (selectedBranch === "all") {
        lane = branchLanes[commit.branch] || 0;
      } else {
        lane =
          commit.branch === selectedBranch
            ? branchLanes[selectedBranch]
            : branchLanes["main"] || 0;
      }

      const y = index * yStep + 50;
      commitPositions.set(commit.id, { x: lane, y });
      node.x = y;
      node.y = lane;
    });

    g.selectAll(".branch-label")
      .data(branches)
      .enter()
      .append("text")
      .attr("class", "branch-label")
      .attr("x", (d, i) => i * 60)
      .attr("y", 20)
      .text((d) => d.name)
      .attr("font-size", "12px")
      .attr("fill", (d) => d.color);

    const highlightedCommits = new Set(
      selectedBranch === "all"
        ? commits.map((c) => c.id)
        : commits.filter((c) => c.branch === selectedBranch).map((c) => c.id)
    );

    const line = d3
      .line()
      .curve(d3.curveMonotoneX)
      .x((d) => d.y)
      .y((d) => d.x);

    g.selectAll(".link")
      .data(dag.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) => {
        const sourcePos = commitPositions.get(d.source.id);
        const targetPos = commitPositions.get(d.target.id);
        if (!sourcePos || !targetPos) return "";
        const points = [
          { x: sourcePos.y, y: sourcePos.x },
          { x: targetPos.y, y: targetPos.x },
        ];
        return line(points);
      })
      .attr("fill", "none")
      .attr("stroke", (d) => {
        return (
          branches.find((b) => b.name === d.source.data.branch)?.color || "#555"
        );
      })
      .attr("stroke-width", 2)
      .attr("opacity", (d) => (highlightedCommits.has(d.target.id) ? 1 : 0.3));

    const node = g
      .selectAll(".node")
      .data(dag.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("mouseover", (event, d) => setHighlightedCommit(d.data.id))
      .on("mouseout", () => setHighlightedCommit(null));

    node
      .append("circle")
      .attr("r", 6)
      .attr("fill", (d) => {
        return branches.find((b) => b.name === d.data.branch)?.color || "#999";
      })
      .attr("stroke", (d) => (d.data.isMerge ? "#000" : "none"))
      .attr("stroke-width", 2)
      .attr("fill-opacity", (d) => (d.data.isMerge ? 0 : 1))
      .attr("opacity", (d) => (highlightedCommits.has(d.data.id) ? 1 : 0.3));

    node
      .append("text")
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#FFF")
      .attr("font-size", "12px")
      .attr("opacity", (d) => (highlightedCommits.has(d.data.id) ? 1 : 0.3))
      .text((d) => d.data.message.substring(0, 20) + "...");
  }, [commits, branches, loading, error, selectedBranch]);

  const getFilteredCommits = () => {
    if (selectedBranch === "all") {
      return commits;
    }

    const branchCommits = commits.filter((c) => c.branch === selectedBranch);
    const ancestors = new Set();
    const visit = (commitId) => {
      if (!commitId || ancestors.has(commitId)) return;
      const commit = commits.find((c) => c.id === commitId);
      if (!commit) return;
      ancestors.add(commitId);
      if (commit.parent) visit(commit.parent);
      if (commit.mergeParent) visit(commit.mergeParent);
    };

    branchCommits.forEach((commit) => visit(commit.id));
    return commits.filter((c) => ancestors.has(c.id));
  };

  const filteredCommits = getFilteredCommits();

  const sidePanelItems = filteredCommits
    .map((commit) => ({
      key: `commit-${commit.id}`,
      type: commit.isMerge ? "merge" : "commit",
      sha: commit.id,
      description:
        commit.isMerge && commit.pr
          ? `${commit.message} (${commit.pr})`
          : commit.message,
      date: new Date(commit.timestamp),
      author: commit.author,
    }))
    .sort((a, b) => b.date - a.date);

  return (
    <Box className="p-6 bg-[#161616] min-h-screen text-white w-full">
      {error && (
        <Typography className="text-red-500 mb-4">Error: {error}</Typography>
      )}

      <Box className="flex items-center gap-4 mb-6 flex-wrap">
        <FormControl
          sx={{
            minWidth: 200,
            backgroundColor: "#3B82F6",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "#2563EB",
            },
          }}
        >
          <InputLabel sx={{ color: "white", fontSize: "14px" }}>
            Filter by Branch
          </InputLabel>
          <Select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            label="Filter by Branch"
            sx={{
              color: "white",
              fontSize: "14px",
              ".MuiSvgIcon-root": { color: "white" },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "transparent",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "transparent",
              },
            }}
          >
            <MenuItem value="all">All</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.name} value={branch.name}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box className="flex gap-3 flex-wrap">
          {branches.map((branch) => (
            <Typography
              key={branch.name}
              className="flex items-center text-sm text-white"
            >
              <span
                className="inline-block w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: branch.color }}
              ></span>
              {branch.name}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box
        className="flex gap-6 w-full"
        sx={{
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <TreeContainer
          ref={containerRef}
          sx={{
            width: { xs: "100%", md: "50%" },
            height: { xs: "400px", md: "600px" },
          }}
        >
          <Typography variant="h6" className="mb-2 text-white">
            Tree Visualization
          </Typography>
          {loading ? (
            <LoadingContainer>
              <CircularProgress
                sx={{ color: "#A0A0A0" }}
                size={40}
                thickness={4}
              />
              <Typography className="text-[#9ca3af]">
                Loading Git Tree...
              </Typography>
            </LoadingContainer>
          ) : error ? (
            <Typography className="text-red-500">
              Unable to display Git Tree
            </Typography>
          ) : (
            <Box sx={{ flex: 1 }}>
              <svg
                ref={svgRef}
                className="w-full"
                style={{ height: `${treeHeight}px` }}
              ></svg>
            </Box>
          )}
        </TreeContainer>

        <CommitListContainer
          sx={{
            width: { xs: "100%", md: "50%" },
            height: { xs: "400px", md: "600px" },
          }}
        >
          <Typography variant="h6" className="mb-2 text-white">
            Commit History
          </Typography>
          {loading ? (
            <LoadingContainer>
              <CircularProgress
                sx={{ color: "#A0A0A0" }}
                size={40}
                thickness={4}
              />
              <Typography className="text-[#9ca3af]">
                Loading Commit History...
              </Typography>
            </LoadingContainer>
          ) : error ? (
            <Typography className="text-red-500">
              Unable to display Commit History
            </Typography>
          ) : (
            <Box>
              {sidePanelItems.length === 0 ? (
                <Typography className="text-[#9ca3af]">
                  No commits to display.
                </Typography>
              ) : (
                sidePanelItems.map((item) => (
                  <Box
                    key={item.key}
                    className={`flex items-center gap-4 py-2 border-b border-gray-700 last:border-none ${
                      highlightedCommit === item.sha ? "bg-gray-800" : ""
                    }`}
                  >
                    {item.type === "merge" ? (
                      <MergeIcon className="text-purple-500" />
                    ) : (
                      <CommitIcon className="text-blue-500" />
                    )}
                    <Box className="flex-1">
                      <Typography className="text-sm text-white">
                        {item.description}
                      </Typography>
                      <Typography className="text-xs text-gray-500">
                        {item.sha.substring(0, 7)} - {item.author} -{" "}
                        {new Date(item.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </CommitListContainer>
      </Box>
    </Box>
  );
};

export default GitTreeComponent;
