import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TeamInitializationModal } from "@/components/TeamInitializationModal";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import GlobalSidebar from "./components/GlobalSidebar";
import DashboardLayout from "./components/DashboardLayout";
import Homepage from "./pages/Homepage";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LeadMagnet from "./pages/LeadMagnet";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Verify from "./pages/Verify";
import Account from "./pages/Account";
import FreeTool from "./pages/FreeTool";
import TaskListPage from "./pages/TaskListPage";
import { JourneyDashboard, JourneyStepPage } from "./pages/journey";
import NotFound from "./pages/not-found";
import AdminPanel from "./pages/ops/AdminPanel";
import ProjectsTab from "./pages/dashboard/ProjectsTab";
import ObjectivesTab from "./pages/dashboard/ObjectivesTab";
import ScoreboardTab from "./pages/dashboard/ScoreboardTab";
import RRGTTab from "./pages/dashboard/RRGTTab";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/pricing" component={Pricing} />
      {/* Place the dynamic blog post route before the list route to avoid shadowing */}
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/blog" component={Blog} />
      <Route path="/lead-magnet" component={LeadMagnet} />
      <Route path="/signup" component={SignUp} />
      <Route path="/signin" component={SignIn} />
      <Route path="/verify" component={Verify} />
      <Route path="/account" component={Account} />
      <Route path="/free-tool" component={FreeTool} />
      <Route path="/tasks" component={TaskListPage} />
      <Route path="/journey" component={JourneyDashboard} />
      <Route path="/journey/:moduleId/step/:step" component={JourneyStepPage} />
      <Route path="/ops" component={AdminPanel} />
      
      {/* Protected Dashboard Routes */}
      <Route path="/dashboard/projects">
        <ProtectedRoute>
          <DashboardLayout>
            <ProjectsTab />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/objectives">
        <ProtectedRoute>
          <DashboardLayout>
            <ObjectivesTab />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/scoreboard">
        <ProtectedRoute>
          <DashboardLayout>
            <ScoreboardTab />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/rrgt">
        <ProtectedRoute>
          <DashboardLayout>
            <RRGTTab />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <GlobalSidebar />
              <Navigation />
              <Router />
              <Footer />
              <Toaster />
              <TeamInitializationModal />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
