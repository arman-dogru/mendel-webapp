import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/api";
import "./HomePageNavbar.css";

function HomePageNavbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await logout();
      navigate("/", { replace: true });
    } catch (error) {
      alert(
        "Logout failed: " + (error.response?.data?.message || error.message),
      );
    }
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
          <IconButton onClick={handleLogout}>
            <FiLogOut className="text-gray-400 hover:text-white text-2xl transition-colors duration-200" />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default HomePageNavbar;
