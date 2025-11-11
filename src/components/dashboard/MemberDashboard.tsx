import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare, Bell } from "lucide-react";
import { format } from "date-fns";

interface MemberDashboardProps {
  user: User | null;
}

const MemberDashboard = ({ user }: MemberDashboardProps) => {
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadMyData();
      
      // Subscribe to real-time changes
      const tasksChannel = supabase
        .channel('member-tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`
          },
          () => {
            loadMyData();
          }
        )
        .subscribe();

      const eventsChannel = supabase
        .channel('member-events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events'
          },
          () => {
            loadMyData();
          }
        )
        .subscribe();

      const announcementsChannel = supabase
        .channel('member-announcements-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'announcements'
          },
          () => {
            loadMyData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(eventsChannel);
        supabase.removeChannel(announcementsChannel);
      };
    }
  }, [user]);

  const loadMyData = async () => {
    const [tasksRes, eventsRes, announcementsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user?.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .order("event_date", { ascending: true })
        .limit(3),
      supabase
        .from("announcements")
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    setMyTasks(tasksRes.data || []);
    setUpcomingEvents(eventsRes.data || []);
    setAnnouncements(announcementsRes.data || []);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Welcome Back!
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening with your team
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                My Tasks
              </CardTitle>
            </div>
            <CardDescription>Your assigned tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: <span className="text-accent">{task.status.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </div>
            <CardDescription>Your team's schedule</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.event_date), "PPP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Recent Announcements
          </CardTitle>
          <CardDescription>Stay updated with team news</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recent announcements
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`p-3 rounded-lg border ${
                    announcement.is_important 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-secondary/50 border-border'
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(announcement.created_at), "PPP")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberDashboard;
