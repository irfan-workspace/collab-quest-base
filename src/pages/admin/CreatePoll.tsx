import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CreatePoll = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [poll, setPoll] = useState({
    title: "",
    description: "",
    expires_at: ""
  });
  const [options, setOptions] = useState<string[]>(["", ""]);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!poll.title.trim()) {
      toast.error("Please enter a poll title");
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const { data: pollData, error: pollError } = await supabase
      .from("polls")
      .insert({
        title: poll.title,
        description: poll.description,
        expires_at: poll.expires_at || null,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (pollError) {
      console.error("Error creating poll:", pollError);
      toast.error("Failed to create poll");
      setSaving(false);
      return;
    }

    const optionsData = validOptions.map(opt => ({
      poll_id: pollData.id,
      option_text: opt
    }));

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsData);

    if (optionsError) {
      console.error("Error creating options:", optionsError);
      toast.error("Failed to create poll options");
      setSaving(false);
      return;
    }

    toast.success("Poll created successfully!");
    navigate("/polls");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/polls")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Polls
        </Button>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Create New Poll</CardTitle>
            <CardDescription>Create a poll for team decision-making</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title</Label>
              <Input
                id="title"
                value={poll.title}
                onChange={(e) => setPoll({ ...poll, title: e.target.value })}
                placeholder="e.g., Which hackathon should we attend?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={poll.description}
                onChange={(e) => setPoll({ ...poll, description: e.target.value })}
                placeholder="Add more context about this poll..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={poll.expires_at}
                onChange={(e) => setPoll({ ...poll, expires_at: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addOption} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Poll"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatePoll;