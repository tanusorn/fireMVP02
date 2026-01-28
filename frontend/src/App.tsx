import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth } from "@/contexts/AuthContext";
import { AboutProjectDialog } from "@/components/AboutProjectDialog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import FireSimulation from "./pages/FireSimulation";
import Resources from "./pages/Resources";
import ResourceAllocation from "./pages/ResourceAllocation";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import IncidentsDashboard from "./pages/IncidentsDashboard";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import OperationCenters from "./pages/OperationCenters";
import OperationCenterDetail from "./pages/OperationCenterDetail";
import DailyReport from "./pages/DailyReport";
import SimulationStatistics from "./pages/SimulationStatistics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AboutProjectDialog />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/home"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/fire-simulation"
              element={
                <RequireAuth>
                  <FireSimulation />
                </RequireAuth>
              }
            />
            <Route
              path="/resources"
              element={
                <RequireAuth>
                  <Resources />
                </RequireAuth>
              }
            />
            <Route
              path="/resource-allocation"
              element={
                <RequireAuth>
                  <ResourceAllocation />
                </RequireAuth>
              }
            />
            <Route
              path="/incidents"
              element={
                <RequireAuth>
                  <Incidents />
                </RequireAuth>
              }
            />
            <Route
              path="/incidents/dashboard"
              element={
                <RequireAuth>
                  <IncidentsDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/incidents/:id"
              element={
                <RequireAuth>
                  <IncidentDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/operation-centers"
              element={
                <RequireAuth>
                  <OperationCenters />
                </RequireAuth>
              }
            />
            <Route
              path="/operation-centers/:centerId"
              element={
                <RequireAuth>
                  <OperationCenterDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/daily-report"
              element={
                <RequireAuth>
                  <DailyReport />
                </RequireAuth>
              }
            />
            <Route
              path="/simulation-statistics"
              element={
                <RequireAuth>
                  <SimulationStatistics />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
