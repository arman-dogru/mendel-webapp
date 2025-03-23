import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import "./Navbar.css";

function Navbar() {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#161616",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Toolbar className="flex justify-between px-4">
        {/* Left Section: Logo and Text */}
        <div className="flex items-center space-x-2">
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
        </div>

        {/* Right Section: Icons */}
        <div className="flex items-center space-x-3">
          <IconButton>
            <IoNotificationsOutline className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
          <IconButton>
            <IoSettingsOutline className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
          <IconButton>
            <FaUserCircle className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
