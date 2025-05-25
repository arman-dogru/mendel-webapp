import {
  AppBar,
  Toolbar,
  Typography,
  Button,
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
    navigate("#");
  };

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between border-b border-border bg-background px-7 md:px-12 max-w-svw overflow-x-scroll md:overflow-x-hidden overflow-y-hidden py-4 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <img
            src="/MENDEL_LAB_LOGO-nobackground.png"
            alt="Mendel Lab Logo"
            className="h-6 w-6"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
          />
          <span
            className="text-sm font-semibold text-textPrimary tracking-wide rounded-md px-4 py-2"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
          >
            MENDEL
          </span>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavigation(link.path, link.tab)}
              className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-100 hover:[&_svg]:opacity-90 underline-offset-4 hover:underline h-9 px-4 py-2 mt-0.5 font-normal ${
                activeTab === link.tab ? "text-zinc-50" : "text-zinc-300"
              } cursor-pointer hover:bg-accent hover:text-accent-foreground`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground size-9"
          aria-label="Notifications"
        >
          <IoNotificationsOutline className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-textSecondary hover:text-accent-foreground transition-colors duration-200" />
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground size-9"
          aria-label="Settings"
        >
          <IoSettingsOutline className="h-2 w-2 md:h-5 md:w-5 lg:h-6 lg:w-6 text-textSecondary hover:text-accent-foreground transition-colors duration-200" />
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground size-8 relative rounded-full"
          onClick={handleProfileClick}
          aria-controls={open ? "profile-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <FaUserCircle className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-textSecondary hover:text-accent-foreground transition-colors duration-200" />
        </button>
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
          <MenuItem className="text-sm" onClick={handleProfileMenuClick}>
            Profile
          </MenuItem>
          <MenuItem className="text-sm" onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}

export default Navbar;
