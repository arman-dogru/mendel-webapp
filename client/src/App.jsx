// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Dashboard from './components/Dashboard/Dashboard';
import RepoPage from './pages/RepoPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/repo/:id" element={<RepoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
