import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import UserProfilePage from "./pages/UserProfilePage";
import { RepoProvider } from "./context/RepoContext";

function AppContent() {
  return (
    <div className="flex flex-col min-h-screen dark-bg">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/homepage"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/:repoFullName"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:owner/:repo/:contributor"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <div className="text-center p-6 text-red-500">
                  404 - Page Not Found
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <RepoProvider>
        <AppContent />
      </RepoProvider>
    </Router>
  );
}

export default App;
