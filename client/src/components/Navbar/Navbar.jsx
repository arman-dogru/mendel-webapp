import { Menu, MenuItem } from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../utils/api";

function Navbar({ setActiveTab, activeTab, repo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const repoPath = repo ? `/${encodeURIComponent(repo)}` : "";
    navigate(`/dashboard${repoPath}?tab=${tab}`, {
      replace: true,
    });
    setMobileMenuOpen(false);
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-20 flex h-16 min-h-[64px] w-full items-center justify-between border-b border-border bg-background px-3 py-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
        {/* Left Section - Logo and Desktop Navigation */}
        <div className="flex items-center">
          {/* Logo Section */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <img
              src="/MENDEL_LAB_LOGO-nobackground.png"
              alt="Mendel Lab Logo"
              className="h-6 w-6 cursor-pointer object-contain  sm:h-7 sm:w-7 md:h-8 md:w-8"
              onClick={handleLogoClick}
            />
            <span
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold tracking-wide text-textPrimary transition-colors duration-200 hover:bg-accent hover:text-accent-foreground sm:px-3 sm:py-2 sm:text-sm md:text-base"
              onClick={handleLogoClick}
            >
              MENDEL
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="ml-4 hidden items-center space-x-1 lg:flex xl:space-x-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavigation(link.path, link.tab)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring xl:px-4 xl:text-sm ${
                  activeTab === link.tab
                    ? "text-zinc-50 bg-accent/20"
                    : "text-zinc-300 hover:text-zinc-50"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <HiX className="h-5 w-5 text-textSecondary" />
            ) : (
              <HiOutlineMenu className="h-5 w-5 text-textSecondary" />
            )}
          </button>

          {/* Notifications Button */}
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9 md:h-10 md:w-10"
            aria-label="Notifications"
          >
            <IoNotificationsOutline className="h-4 w-4 text-textSecondary transition-colors duration-200 hover:text-accent-foreground sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>

          {/* Settings Button */}
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9 md:h-10 md:w-10"
            aria-label="Settings"
          >
            <IoSettingsOutline className="h-4 w-4 text-textSecondary transition-colors duration-200 hover:text-accent-foreground sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>

          {/* Profile Button */}
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-9 md:h-10 md:w-10"
            onClick={handleProfileClick}
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <FaUserCircle className="h-4 w-4 text-textSecondary transition-colors duration-200 hover:text-accent-foreground sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>

          {/* Profile Menu */}
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
            slotProps={{
              paper: {
                className: "mt-1 min-w-[120px]",
              },
            }}
          >
            <MenuItem
              className="text-sm px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
              onClick={handleProfileMenuClick}
            >
              Profile
            </MenuItem>
            <MenuItem
              className="text-sm px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
              onClick={handleLogout}
            >
              Logout
            </MenuItem>
          </Menu>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-10 border-b border-border bg-background px-3 py-4 shadow-lg lg:hidden">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavigation(link.path, link.tab)}
                className={`flex w-full items-center justify-start rounded-md px-4 py-3 text-left text-sm font-medium transition-colors duration-200 hover:bg-accent hover:text-accent-foreground ${
                  activeTab === link.tab
                    ? "text-zinc-50 bg-accent/20"
                    : "text-zinc-300 hover:text-zinc-50"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-0 bg-black/20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

export default Navbar;
