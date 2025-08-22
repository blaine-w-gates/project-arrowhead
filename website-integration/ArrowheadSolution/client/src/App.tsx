import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import GlobalSidebar from "./components/GlobalSidebar";
import Homepage from "./pages/Homepage";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LeadMagnet from "./pages/LeadMagnet";
import SignUp from "./pages/SignUp";
import FreeTool from "./pages/FreeTool";
import TaskListPage from "./pages/TaskListPage";
import { JourneyDashboard, JourneyStepPage } from "./pages/journey";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/lead-magnet" component={LeadMagnet} />
      <Route path="/signup" component={SignUp} />
      <Route path="/free-tool" component={FreeTool} />
      <Route path="/tasks" component={TaskListPage} />
      <Route path="/journey" component={JourneyDashboard} />
      <Route path="/journey/:moduleId/step/:step" component={JourneyStepPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <GlobalSidebar />
          <Navigation />
          <Router />
          <Footer />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
