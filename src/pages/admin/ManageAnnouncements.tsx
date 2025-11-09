import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  created_at: string;
}

const ManageAnnouncements = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_important: false
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
    await loadAnnouncements();
    setLoading(false);
  };

  const loadAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading announcements:", error);
      toast.error("Failed to load announcements");
    } else {
      setAnnouncements(data || []);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const announcementData = {
      ...formData,
      created_by: user.id
    };

    if (editingAnnouncement) {
      const { error } = await supabase
        .from("announcements")
        .update(announcementData)
        .eq("id", editingAnnouncement.id);

      if (error) {
        console.error("Error updating announcement:", error);
        toast.error("Failed to update announcement");
        return;
      }

      toast.success("Announcement updated successfully!");
    } else {
      const { error } = await supabase
        .from("announcements")
        .insert(announcementData);

      if (error) {
        console.error("Error creating announcement:", error);
        toast.error("Failed to create announcement");
        return;
      }

      toast.success("Announcement created successfully!");
    }

    setDialogOpen(false);
    resetForm();
    await loadAnnouncements();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_important: announcement.is_important
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
      return;
    }

    toast.success("Announcement deleted successfully!");
    await loadAnnouncements();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      is_important: false
    });
    setEditingAnnouncement(null);
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
            Manage Announcements
          </h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
                <DialogDescription>
                  {editingAnnouncement ? "Update announcement details" : "Share an important update with the team"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Announcement details"
                    rows={5}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="important"
                    checked={formData.is_important}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_important: checked })}
                  />
                  <Label htmlFor="important">Mark as important</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={`bg-card border-border ${announcement.is_important ? "border-primary" : ""}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {announcement.is_important && (
                        <Megaphone className="h-5 w-5 text-primary" />
                      )}
                      {announcement.title}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(announcement.created_at), "PPP")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageAnnouncements;