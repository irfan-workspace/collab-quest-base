import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import Events from "./pages/Events";
import Tasks from "./pages/Tasks";
import Announcements from "./pages/Announcements";
import Chat from "./pages/Chat";
import Polls from "./pages/Polls";
import ProfileSettings from "./pages/ProfileSettings";
import ManageTeam from "./pages/admin/ManageTeam";
import ManageEvents from "./pages/admin/ManageEvents";
import ManageTasks from "./pages/admin/ManageTasks";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import CreatePoll from "./pages/admin/CreatePoll";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/team" element={<Team />} />
          <Route path="/events" element={<Events />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/polls" element={<Polls />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/admin/team" element={<ManageTeam />} />
          <Route path="/admin/events" element={<ManageEvents />} />
          <Route path="/admin/tasks" element={<ManageTasks />} />
          <Route path="/admin/announcements" element={<ManageAnnouncements />} />
          <Route path="/admin/polls/create" element={<CreatePoll />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
