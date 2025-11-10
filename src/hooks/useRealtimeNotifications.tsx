import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, CheckSquare, Calendar, BarChart3 } from "lucide-react";

interface UseRealtimeNotificationsProps {
  userId: string | undefined;
  isEnabled?: boolean;
}

export const useRealtimeNotifications = ({ 
  userId, 
  isEnabled = true 
}: UseRealtimeNotificationsProps) => {
  useEffect(() => {
    if (!userId || !isEnabled) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel("messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Don't notify about own messages
          if (newMessage.user_id === userId) return;
          
          // Only notify about public messages
          if (newMessage.is_private) return;

          // Get sender's name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMessage.user_id)
            .single();

          toast.success(`New message from ${profile?.full_name || "Someone"}`, {
            icon: <MessageSquare className="h-4 w-4" />,
            description: newMessage.content.substring(0, 100),
          });
        }
      )
      .subscribe();

    // Subscribe to task assignments and updates
    const tasksChannel = supabase
      .channel("tasks-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          const task = payload.new as any;
          const eventType = payload.eventType;
          
          // Only notify if task is assigned to current user
          if (task.assigned_to !== userId) return;
          
          // Don't notify about own task updates
          if (task.created_by === userId && eventType === "INSERT") return;

          if (eventType === "INSERT") {
            const { data: creator } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.created_by)
              .single();

            toast.info(`New task assigned: ${task.title}`, {
              icon: <CheckSquare className="h-4 w-4" />,
              description: `Assigned by ${creator?.full_name || "Admin"}`,
            });
          } else if (eventType === "UPDATE") {
            toast.info(`Task updated: ${task.title}`, {
              icon: <CheckSquare className="h-4 w-4" />,
              description: `Status: ${task.status.replace("_", " ")}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to new events
    const eventsChannel = supabase
      .channel("events-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        async (payload) => {
          const event = payload.new as any;
          
          // Don't notify about own events
          if (event.created_by === userId) return;

          const eventDate = new Date(event.event_date);
          const dateStr = eventDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          toast.success(`New event: ${event.title}`, {
            icon: <Calendar className="h-4 w-4" />,
            description: `${dateStr} • ${event.location || "Location TBA"}`,
          });
        }
      )
      .subscribe();

    // Subscribe to new polls
    const pollsChannel = supabase
      .channel("polls-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "polls",
        },
        async (payload) => {
          const poll = payload.new as any;
          
          // Don't notify about own polls
          if (poll.created_by === userId) return;

          toast.info(`New poll: ${poll.title}`, {
            icon: <BarChart3 className="h-4 w-4" />,
            description: poll.description?.substring(0, 100) || "Vote now!",
          });
        }
      )
      .subscribe();

    // Check for expiring polls (polls expiring in the next hour)
    const checkExpiringPolls = async () => {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

      const { data: expiringPolls } = await supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .not("expires_at", "is", null)
        .lte("expires_at", oneHourFromNow.toISOString())
        .gte("expires_at", new Date().toISOString());

      if (expiringPolls && expiringPolls.length > 0) {
        // Check if user has voted
        for (const poll of expiringPolls) {
          const { data: vote } = await supabase
            .from("poll_votes")
            .select("id")
            .eq("poll_id", poll.id)
            .eq("user_id", userId)
            .single();

          if (!vote) {
            toast.warning(`Poll expiring soon: ${poll.title}`, {
              icon: <BarChart3 className="h-4 w-4" />,
              description: "Don't forget to vote!",
            });
          }
        }
      }
    };

    // Check for expiring polls on mount and every 30 minutes
    checkExpiringPolls();
    const expiringPollsInterval = setInterval(checkExpiringPolls, 30 * 60 * 1000);

    // Check for upcoming events (events in the next 24 hours)
    const checkUpcomingEvents = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: upcomingEvents } = await supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .gte("event_date", new Date().toISOString())
        .lte("event_date", tomorrow.toISOString());

      if (upcomingEvents && upcomingEvents.length > 0) {
        for (const event of upcomingEvents) {
          const eventDate = new Date(event.event_date);
          const hoursUntil = Math.round((eventDate.getTime() - Date.now()) / (1000 * 60 * 60));

          if (hoursUntil <= 24) {
            toast.info(`Upcoming event: ${event.title}`, {
              icon: <Calendar className="h-4 w-4" />,
              description: `Starting in ${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""}`,
            });
          }
        }
      }
    };

    // Check for upcoming events on mount and every hour
    checkUpcomingEvents();
    const upcomingEventsInterval = setInterval(checkUpcomingEvents, 60 * 60 * 1000);

    // Cleanup
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(pollsChannel);
      clearInterval(expiringPollsInterval);
      clearInterval(upcomingEventsInterval);
    };
  }, [userId, isEnabled]);
};
