import { Menu, MenuItem } from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/api";
import "./HomePageNavbar.css";

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
    <header className="flex h-[var(--header-height)] items-center justify-between border-b border-border bg-background px-7 md:px-12 max-w-svw overflow-x-scroll md:overflow-x-hidden overflow-y-hidden py-4 sticky top-0 z-10">
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
      <div className="flex items-center space-x-3">
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground size-9"
          aria-label="Notifications"
        >
          <IoNotificationsOutline className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-textSecondary hover:text-accent-foreground transition-colors duration-200" />{" "}
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground size-9"
          aria-label="Settings"
        >
          <IoSettingsOutline className="h-2 w-2 md:h-5 md:w-5 lg:h-6 lg:w-6 text-textSecondary hover:text-accent-foreground transition-colors duration-200" />{" "}
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

export default HomePageNavbar;
