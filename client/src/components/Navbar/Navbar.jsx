import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
} from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../utils/api";
import "./Navbar.css";

function Navbar({ setActiveTab, activeTab, repo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const basePath = repo
    ? `/dashboard/${encodeURIComponent(repo)}`
    : "/dashboard";

  const navLinks = [
    { label: "Dashboards", path: basePath, tab: "Dashboards" },
    { label: "PR's", path: basePath, tab: "PRs" },
    { label: "Issues", path: basePath, tab: "Issues" },
    { label: "Teams", path: basePath, tab: "Teams" },
    { label: "Analysis", path: basePath, tab: "Analysis" },
  ];

  const handleNavigation = (path, tab) => {
    setActiveTab(tab);
    const currentParams = new URLSearchParams(location.search);
    currentParams.set("tab", tab);
    navigate(`${location.pathname}?${currentParams.toString()}`, {
      replace: true,
    });
  };

  const handleLogoClick = () => {
    navigate("/homepage");
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      handleClose();
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      alert(
        "Logout failed: " + (error.response?.data?.message || error.message)
      );
    }
  };

  const handleProfileMenuClick = () => {
    handleClose();
    // Navigate to profile page
    navigate("#");
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
              src="/MENDEL_LAB_LOGO-nobackground.png"
              alt="Mendel Lab Logo"
              className="logo"
              onClick={handleLogoClick}
              style={{ cursor: "pointer" }}
            />
            <Typography
              variant="h6"
              className="text-white font-semibold tracking-wide"
              onClick={handleLogoClick}
              style={{ cursor: "pointer" }}
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
          <IconButton
            aria-label="User profile"
            onClick={handleProfileClick}
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <FaUserCircle className="text-gray-400 hover:text-white transition-colors duration-200" />
          </IconButton>
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "profile-button",
            }}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleProfileMenuClick}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
