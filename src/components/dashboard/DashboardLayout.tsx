import { ReactNode, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, CheckSquare, Bell, LogOut, LayoutDashboard, UserCircle, MessageSquare, BarChart3, Settings, Shield, BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface DashboardLayoutProps {
  children: ReactNode;
  user: User | null;
  isAdmin: boolean;
}

const DashboardLayout = ({ children, user, isAdmin }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Enable real-time notifications
  useRealtimeNotifications({ 
    userId: user?.id, 
    isEnabled: notificationsEnabled 
  });

  // Load user avatar
  useEffect(() => {
    if (user?.id) {
      loadUserAvatar();
    }
  }, [user?.id]);

  const loadUserAvatar = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user?.id)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
    navigate("/auth");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Team", path: "/team" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Bell, label: "Announcements", path: "/announcements" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: BarChart3, label: "Polls", path: "/polls" },
  ];

  const adminNavItems = [
    { icon: Shield, label: "Manage Team", path: "/admin/team" },
    { icon: Calendar, label: "Manage Events", path: "/admin/events" },
    { icon: CheckSquare, label: "Manage Tasks", path: "/admin/tasks" },
    { icon: Bell, label: "Manage Announcements", path: "/admin/announcements" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Team Hub</h1>
                {isAdmin && (
                  <span className="text-xs text-primary font-medium">Admin Access</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotificationsEnabled(!notificationsEnabled);
                  toast({
                    title: notificationsEnabled ? "Notifications disabled" : "Notifications enabled",
                    description: notificationsEnabled 
                      ? "You won't receive real-time updates" 
                      : "You'll receive real-time updates",
                  });
                }}
                className={`text-muted-foreground hover:text-foreground ${notificationsEnabled ? "text-primary" : ""}`}
                title={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
              >
                {notificationsEnabled ? (
                  <BellRing className="h-4 w-4 mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {notificationsEnabled ? "On" : "Off"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-secondary rounded-lg">
                <Avatar className="h-6 w-6">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="User avatar" />
                  ) : (
                    <AvatarFallback className="bg-primary/20">
                      <UserCircle className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-sm text-foreground">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          
          {/* Navigation Links */}
          <div className="flex space-x-1 pb-3 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
            {isAdmin && (
              <>
                <div className="w-px bg-border mx-2" />
                {adminNavItems.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
