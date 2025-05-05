import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAuthStatus } from "../utils/api";
import RepoPermissionModal from "../components/RepoPermission/RepoPermissionComponent";

function RepoPermissionsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await checkAuthStatus();

        if (!authenticated) {
          navigate("/");
          return;
        }

        setIsAuthenticated(true);
        setModalOpen(true);
      } catch (err) {
        console.error("Auth check error:", err);
        navigate("/");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleModalClose = () => {
    // This shouldn't happen as the modal is meant to force a choice
    // But we'll handle it anyway
    navigate("/homepage");
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-darkBg flex justify-center items-center">
        <div className="text-textSecondary">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darkBg">
      <RepoPermissionModal open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}

export default RepoPermissionsPage;
