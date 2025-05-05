import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
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
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#161616",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Toolbar className="flex justify-between px-4">
        <div className="flex items-center space-x-2">
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
        </div>
        <div className="flex items-center space-x-3">
          <IconButton>
            <IoNotificationsOutline className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
          <IconButton>
            <IoSettingsOutline className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
          <IconButton
            onClick={handleProfileClick}
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <FaUserCircle className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
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
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default HomePageNavbar;
