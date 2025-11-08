import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckSquare, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    activeTasks: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [membersRes, eventsRes, activeTasksRes, completedTasksRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }),
      supabase.from("events").select("id", { count: "exact" }).eq("status", "upcoming"),
      supabase.from("tasks").select("id", { count: "exact" }).neq("status", "completed"),
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "completed"),
    ]);

    setStats({
      totalMembers: membersRes.count || 0,
      upcomingEvents: eventsRes.count || 0,
      activeTasks: activeTasksRes.count || 0,
      completedTasks: completedTasksRes.count || 0,
    });
  };

  const statCards = [
    {
      title: "Team Members",
      value: stats.totalMembers,
      icon: Users,
      description: "Active in team",
      color: "text-primary",
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Calendar,
      description: "Scheduled hackathons",
      color: "text-accent",
    },
    {
      title: "Active Tasks",
      value: stats.activeTasks,
      icon: CheckSquare,
      description: "In progress",
      color: "text-orange-400",
    },
    {
      title: "Completed",
      value: stats.completedTasks,
      icon: TrendingUp,
      description: "Tasks finished",
      color: "text-green-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Admin Dashboard
        </h2>
        <p className="text-muted-foreground">
          Overview of team activity and metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your team efficiently</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Navigate to Team, Events, Tasks, or Announcements using the menu above to manage your team.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest team updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity feed coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
