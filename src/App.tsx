import React, { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";

// Tool Pages
import FiveMinuteExplainer from "./pages/tools/FiveMinuteExplainer";
import WriteUnblock from "./pages/tools/WriteUnblock";
import TeachMeBack from "./pages/tools/TeachMeBack";
import DeadlineReverse from "./pages/tools/DeadlineReverse";
import PYQSolver from "./pages/tools/PYQSolver";
import LectureDigest from "./pages/tools/LectureDigest";
import WhyAmIWrong from "./pages/tools/WhyAmIWrong";
import ConceptLinker from "./pages/tools/ConceptLinker";
import SnapSolve from "./pages/tools/SnapSolve";
import CollaborationHub from "./pages/CollaborationHub";
import CollabRoom from "./pages/CollabRoom";
import Flashcards from "./pages/Flashcards";
import History from "./pages/History";
import PanicMode from "./pages/PanicMode";
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-bold text-xl uppercase tracking-widest">
          Authenticating...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/explainer"
            element={
              <ProtectedRoute>
                <Layout>
                  <FiveMinuteExplainer />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/writeunblock"
            element={
              <ProtectedRoute>
                <Layout>
                  <WriteUnblock />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/teachmeback"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeachMeBack />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/deadline"
            element={
              <ProtectedRoute>
                <Layout>
                  <DeadlineReverse />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/pyqsolver"
            element={
              <ProtectedRoute>
                <Layout>
                  <PYQSolver />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/lecturedigest"
            element={
              <ProtectedRoute>
                <Layout>
                  <LectureDigest />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/whyamiwrong"
            element={
              <ProtectedRoute>
                <Layout>
                  <WhyAmIWrong />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/conceptlinker"
            element={
              <ProtectedRoute>
                <Layout>
                  <ConceptLinker />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools/snapsolve"
            element={
              <ProtectedRoute>
                <Layout>
                  <SnapSolve />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/panic"
            element={
              <ProtectedRoute>
                <PanicMode />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hub"
            element={
              <ProtectedRoute>
                <Layout>
                  <CollaborationHub />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/collab/:sessionId"
            element={
              <ProtectedRoute>
                <CollabRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/flashcards"
            element={
              <ProtectedRoute>
                <Layout>
                  <Flashcards />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Layout>
                  <History />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
