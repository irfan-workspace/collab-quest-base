import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  project_name: string;
  deadline: string;
  status: string;
  profiles?: {
    full_name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
}

const ManageTasks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    project_name: "",
    deadline: "",
    status: "todo"
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!data) {
      navigate("/dashboard");
      toast.error("Admin access required");
      return;
    }

    setUser(session.user);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const [tasksResult, profilesResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
    ]);

    if (tasksResult.error) {
      console.error("Error loading tasks:", tasksResult.error);
      toast.error("Failed to load tasks");
      return;
    }

    if (profilesResult.error) {
      console.error("Error loading profiles:", profilesResult.error);
      setProfiles([]);
    } else {
      setProfiles(profilesResult.data || []);
    }

    const profilesMap = new Map(
      (profilesResult.data || []).map(p => [p.id, p])
    );

    const tasksWithProfiles = (tasksResult.data || []).map(task => ({
      ...task,
      profiles: task.assigned_to ? profilesMap.get(task.assigned_to) : null
    }));

    setTasks(tasksWithProfiles);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter task title");
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description,
      assigned_to: formData.assigned_to || null,
      project_name: formData.project_name,
      deadline: formData.deadline || null,
      status: formData.status as "todo" | "in_progress" | "completed",
      created_by: user.id
    };

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", editingTask.id);

      if (error) {
        console.error("Error updating task:", error);
        toast.error("Failed to update task");
        return;
      }

      toast.success("Task updated successfully!");
    } else {
      const { error } = await supabase
        .from("tasks")
        .insert(taskData);

      if (error) {
        console.error("Error creating task:", error);
        toast.error("Failed to create task");
        return;
      }

      toast.success("Task created successfully!");
    }

    setDialogOpen(false);
    resetForm();
    await loadData();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      project_name: task.project_name || "",
      deadline: task.deadline || "",
      status: task.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted successfully!");
    await loadData();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      project_name: "",
      deadline: "",
      status: "todo"
    });
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} isAdmin={true}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Manage Tasks
          </h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
                <DialogDescription>
                  {editingTask ? "Update task details" : "Assign a new task to team members"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Task details"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name</Label>
                  <Input
                    id="project_name"
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    placeholder="Project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription>
                      Assigned to: {task.profiles?.full_name || "Unassigned"}
                      {task.project_name && ` • ${task.project_name}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTasks;