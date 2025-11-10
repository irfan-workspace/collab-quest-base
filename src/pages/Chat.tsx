import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { format } from "date-fns";

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

const Chat = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadMessages();
      subscribeToMessages();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    setLoading(false);
  };

  const loadMessages = async () => {
    const [messagesResult, profilesResult] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("is_private", false)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name")
    ]);

    if (messagesResult.error) {
      console.error("Error loading messages:", messagesResult.error);
      toast.error("Failed to load messages");
      return;
    }

    const profilesMap = new Map(
      (profilesResult.data || []).map(p => [p.id, p])
    );

    const messagesWithProfiles = (messagesResult.data || []).map(msg => ({
      ...msg,
      profiles: profilesMap.get(msg.user_id)
    }));

    setMessages(messagesWithProfiles);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        async (payload) => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.new.user_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: data
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);

    const { error } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        content: newMessage.trim(),
        is_private: false
      });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }

    setSending(false);
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
        <h1 className="text-3xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Team Chat
        </h1>

        <Card className="bg-card border-border h-[600px] flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.user_id === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.user_id === user.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {message.profiles?.full_name || "Unknown User"}
                    </div>
                    <div className="break-words">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {format(new Date(message.created_at), "HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !sending && handleSend()}
                placeholder="Type a message..."
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Chat;