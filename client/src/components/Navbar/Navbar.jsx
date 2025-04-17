import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
} from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar({ setActiveTab, activeTab, repo }) {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = repo
    ? `/dashboard/${encodeURIComponent(repo)}`
    : "/dashboard";

  const navLinks = [
    { label: "Dashboards", path: basePath, tab: "Dashboards" },
    { label: "Branches", path: basePath, tab: "Branches" },
    { label: "PR's", path: basePath, tab: "PRs" },
    { label: "Issues", path: basePath, tab: "Issues" },
    { label: "Analysis", path: basePath, tab: "Analysis" },
  ];

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    // Update URL query parameter when tab changes
     const currentParams = new URLSearchParams(location.search);
     currentParams.set('tab', tab);
    navigate(`${location.pathname}?${currentParams.toString()}`, { replace: true });
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#161616",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Toolbar className="flex justify-between px-4">
        {/* Left Section: Logo, Title, and Navigation Links */}
        <Box className="flex items-center">
          <Box className="flex items-center space-x-2">
            <img
              src="/MENDEL_LAB_LOGO.jpg"
              alt="Mendel Lab Logo"
              className="logo"
            />
            <Typography
              variant="h6"
              className="text-white font-semibold tracking-wide"
            >
              MENDEL
            </Typography>
          </Box>
          <Box className="flex items-center space-x-2 ml-4">
             {navLinks.map((link) => (
               <Button
                 key={link.label}
                 onClick={() => handleNavigation(link.path, link.tab)}
                 sx={{
                   color: activeTab === link.tab ? "#EF4444" : "#9CA3AF",
                   fontWeight: "medium",
                   textTransform: "none",
                   "&:hover": { color: "#FFFFFF" },
                 }}
               >
                 {link.label}
               </Button>
             ))}
           </Box>
        </Box>

        {/* Right Section: Icons */}
        <Box className="flex items-center space-x-1">
          <IconButton aria-label="Notifications">
            <IoNotificationsOutline className="text-gray-400 hover:text-white transition-colors duration-200" />
          </IconButton>
          <IconButton aria-label="Settings">
            <IoSettingsOutline className="text-gray-400 hover:text-white transition-colors duration-200" />
          </IconButton>
          <IconButton aria-label="User profile">
            <FaUserCircle className="text-gray-400 hover:text-white transition-colors duration-200" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
