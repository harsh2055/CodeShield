// client/src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ExplainerPage from './pages/ExplainerPage';
import HistoryPage from './pages/HistoryPage';
import RepoPage from './pages/RepoPage';
import VulnerabilityPage from './pages/VulnerabilityPage';
import RefactoringPage from './pages/RefactoringPage';
import ArchitecturePage from './pages/ArchitecturePage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ExplainerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vulnerability"
              element={
                <ProtectedRoute>
                  <VulnerabilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/refactor"
              element={
                <ProtectedRoute>
                  <RefactoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/architecture"
              element={
                <ProtectedRoute>
                  <ArchitecturePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repo"
              element={
                <ProtectedRoute>
                  <RepoPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;
