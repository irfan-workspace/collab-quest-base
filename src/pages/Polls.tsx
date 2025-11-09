import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { format } from "date-fns";

interface Poll {
  id: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface PollOption {
  id: string;
  option_text: string;
  poll_id: string;
}

interface PollVote {
  option_id: string;
  user_id: string;
}

const Polls = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollOptions, setPollOptions] = useState<Record<string, PollOption[]>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, PollVote[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});

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
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
    await loadPolls();
    setLoading(false);
  };

  const loadPolls = async () => {
    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (pollsError) {
      console.error("Error loading polls:", pollsError);
      return;
    }

    setPolls(pollsData || []);

    for (const poll of pollsData || []) {
      const { data: optionsData } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", poll.id);

      const { data: votesData } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", poll.id);

      setPollOptions(prev => ({ ...prev, [poll.id]: optionsData || [] }));
      setPollVotes(prev => ({ ...prev, [poll.id]: votesData || [] }));

      const userVote = votesData?.find(v => v.user_id === user?.id);
      if (userVote) {
        setUserVotes(prev => ({ ...prev, [poll.id]: userVote.option_id }));
      }
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const { error } = await supabase
      .from("poll_votes")
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      });

    if (error) {
      if (error.code === "23505") {
        const { error: updateError } = await supabase
          .from("poll_votes")
          .update({ option_id: optionId })
          .eq("poll_id", pollId)
          .eq("user_id", user.id);

        if (updateError) {
          toast.error("Failed to update vote");
          return;
        }
      } else {
        toast.error("Failed to vote");
        return;
      }
    }

    toast.success("Vote recorded!");
    await loadPolls();
  };

  const getVotePercentage = (pollId: string, optionId: string) => {
    const votes = pollVotes[pollId] || [];
    const totalVotes = votes.length;
    if (totalVotes === 0) return 0;
    const optionVotes = votes.filter(v => v.option_id === optionId).length;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const getVoteCount = (pollId: string, optionId: string) => {
    const votes = pollVotes[pollId] || [];
    return votes.filter(v => v.option_id === optionId).length;
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
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Team Polls
          </h1>
          {isAdmin && (
            <Button onClick={() => navigate("/admin/polls/create")}>
              Create Poll
            </Button>
          )}
        </div>

        {polls.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active polls yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => (
              <Card key={poll.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{poll.title}</CardTitle>
                  <CardDescription>
                    {poll.description}
                    {poll.expires_at && (
                      <span className="block mt-1">
                        Expires: {format(new Date(poll.expires_at), "PPP")}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pollOptions[poll.id]?.map((option) => {
                    const hasVoted = !!userVotes[poll.id];
                    const isSelected = userVotes[poll.id] === option.id;
                    const percentage = getVotePercentage(poll.id, option.id);
                    const voteCount = getVoteCount(poll.id, option.id);

                    return (
                      <div key={option.id} className="space-y-2">
                        {hasVoted ? (
                          <div className={`p-3 rounded-lg border ${isSelected ? "border-primary bg-primary/10" : "border-border"}`}>
                            <div className="flex justify-between mb-2">
                              <span className="font-medium">{option.option_text}</span>
                              <span className="text-sm text-muted-foreground">
                                {voteCount} vote{voteCount !== 1 ? "s" : ""} ({percentage}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleVote(poll.id, option.id)}
                          >
                            {option.option_text}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Polls;