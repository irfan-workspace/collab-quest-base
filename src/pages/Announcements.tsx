import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const Announcements = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await checkAdminStatus(session.user.id);
    await loadAnnouncements();
    setLoading(false);
  };

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles:created_by(full_name)
      `)
      .order("created_at", { ascending: false });

    setAnnouncements(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} isAdmin={isAdmin}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Team Announcements
          </h2>
          <p className="text-muted-foreground">
            Stay updated with team news and updates
          </p>
        </div>

        {announcements.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`border-border shadow-card hover:shadow-glow transition-all duration-300 ${
                  announcement.is_important ? "bg-gradient-card border-primary/50" : "bg-card"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        {announcement.is_important && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Important
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        Posted by {announcement.profiles?.full_name || "Unknown"} •{" "}
                        {format(new Date(announcement.created_at), "PPP")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
