import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCog, Shield, User } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface TeamMember {
  id: string;
  full_name: string;
  contact_info: string;
  skills: string[];
  role?: string;
}

const ManageTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

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
    await loadMembers();
    setLoading(false);
  };

  const loadMembers = async () => {
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role")
    ]);

    if (profilesResult.error) {
      console.error("Error loading profiles:", profilesResult.error);
      return;
    }

    const rolesMap = new Map(
      (rolesResult.data || []).map(r => [r.user_id, r.role])
    );

    const membersWithRoles = (profilesResult.data || []).map((profile: any) => ({
      ...profile,
      role: rolesMap.get(profile.id) || "member"
    }));

    setMembers(membersWithRoles);
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
      return;
    }

    toast.success(`Role updated to ${newRole}`);
    await loadMembers();
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
        <h1 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Manage Team Members
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          {members.map((member) => (
            <Card key={member.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {member.full_name}
                      {member.role === "admin" && (
                        <Badge variant="default" className="ml-2">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{member.contact_info}</CardDescription>
                  </div>
                  <Button
                    variant={member.role === "admin" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleRole(member.id, member.role || "member")}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    {member.role === "admin" ? "Remove Admin" : "Make Admin"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {member.skills?.length > 0 ? (
                      member.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No skills added</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageTeam;