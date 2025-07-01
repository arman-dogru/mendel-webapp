import { Menu, MenuItem } from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/api";

function HomePageNavbar() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

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

  const handleLogoClick = () => {
    navigate("/homepage");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 min-h-[64px] w-full items-center justify-between border-b border-border bg-background px-3 py-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
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

      {/* Action Buttons Section */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
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
  );
}

export default HomePageNavbar;
