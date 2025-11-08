import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckSquare } from "lucide-react";
import { format } from "date-fns";

const Tasks = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
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
    await loadTasks();
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

  const loadTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        profiles:assigned_to(full_name)
      `)
      .order("created_at", { ascending: false });

    setTasks(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-muted/20 text-muted-foreground border-muted/30";
      case "in_progress":
        return "bg-accent/20 text-accent border-accent/30";
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  return (
    <DashboardLayout user={user} isAdmin={isAdmin}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Task Board
          </h2>
          <p className="text-muted-foreground">
            {tasks.length} total tasks
          </p>
        </div>

        {tasks.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tasks yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {["todo", "in_progress", "completed"].map((status) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground capitalize">
                    {status.replace("_", " ")}
                  </h3>
                  <Badge variant="secondary" className="bg-secondary/50">
                    {groupedTasks[status as keyof typeof groupedTasks].length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {groupedTasks[status as keyof typeof groupedTasks].map((task) => (
                    <Card key={task.id} className="border-border bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        {task.description && (
                          <CardDescription className="text-xs line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {task.profiles && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="font-medium text-primary mr-1">Assigned:</span>
                            {task.profiles.full_name}
                          </div>
                        )}
                        {task.project_name && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="font-medium text-primary mr-1">Project:</span>
                            {task.project_name}
                          </div>
                        )}
                        {task.deadline && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="font-medium text-primary mr-1">Due:</span>
                            {format(new Date(task.deadline), "PP")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
