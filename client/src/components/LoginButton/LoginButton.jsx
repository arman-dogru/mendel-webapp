import { Button } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;
function LoginButton() {
  return (
    <Button
      variant="contained"
      startIcon={<GitHubIcon />}
      href={`${VITE_BASE_URL}/api/auth/login`}
      className="font-semibold"
      sx={{
        backgroundColor: "#000000",
        color: "#ffffff",
        textTransform: "none",
        fontSize: "1rem",
        padding: "8px 16px",
        borderRadius: "8px",
        "&:hover": {
          backgroundColor: "#333333",
        },
      }}
    >
      Sign in with GitHub
    </Button>
  );
}

export default LoginButton;
