import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";
import InterviewReminderEmail from "@/emails/interview-reminder";
import SessionReminderEmail from "@/emails/session-reminder";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

// Use service role for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) return true; // Skip in dev
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    interviewReminders: 0,
    sessionReminders: 0,
    errors: [] as string[],
  };

  // Get tomorrow's date range
  const tomorrow = addDays(new Date(), 1);
  const tomorrowStart = startOfDay(tomorrow).toISOString();
  const tomorrowEnd = endOfDay(tomorrow).toISOString();

  try {
    // 1. Send interview reminders for steps scheduled tomorrow
    const { data: upcomingSteps } = await supabase
      .from("process_steps")
      .select(`
        *,
        recruitment_processes (
          company_name,
          job_title,
          users (
            full_name,
            email
          )
        )
      `)
      .gte("scheduled_date", tomorrowStart)
      .lte("scheduled_date", tomorrowEnd)
      .eq("status", "upcoming");

    if (upcomingSteps) {
      for (const step of upcomingSteps) {
        const process = step.recruitment_processes;
        const user = process?.users;

        if (!user?.email) continue;

        try {
          const scheduledDate = new Date(step.scheduled_date);

          await resend.emails.send({
            from: FROM_EMAIL,
            to: user.email,
            subject: `Reminder: ${step.step_type} with ${process.company_name} tomorrow`,
            react: InterviewReminderEmail({
              userName: user.full_name || "there",
              companyName: process.company_name,
              jobTitle: process.job_title,
              stepType: formatStepType(step.step_type),
              scheduledDate: format(scheduledDate, "EEEE, MMMM d"),
              scheduledTime: format(scheduledDate, "h:mm a"),
              objectives: step.objectives || [],
            }),
          });

          results.interviewReminders++;
        } catch (err) {
          results.errors.push(`Interview reminder failed for ${user.email}: ${err}`);
        }
      }
    }

    // 2. Send coaching session reminders
    const { data: upcomingSessions } = await supabase
      .from("coaching_sessions")
      .select(`
        *,
        coaches (
          users (
            full_name,
            email
          )
        ),
        clients:users!coaching_sessions_client_id_fkey (
          full_name,
          email
        )
      `)
      .gte("scheduled_at", tomorrowStart)
      .lte("scheduled_at", tomorrowEnd)
      .eq("status", "confirmed");

    if (upcomingSessions) {
      for (const session of upcomingSessions) {
        const coach = session.coaches?.users;
        const client = session.clients;
        const scheduledAt = new Date(session.scheduled_at);

        // Send to client
        if (client?.email) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: client.email,
              subject: `Reminder: Coaching session tomorrow at ${format(scheduledAt, "h:mm a")}`,
              react: SessionReminderEmail({
                recipientName: client.full_name || "there",
                otherPartyName: coach?.full_name || "your coach",
                scheduledDate: format(scheduledAt, "EEEE, MMMM d"),
                scheduledTime: format(scheduledAt, "h:mm a"),
                duration: session.duration_minutes,
                isCoach: false,
              }),
            });
            results.sessionReminders++;
          } catch (err) {
            results.errors.push(`Session reminder (client) failed: ${err}`);
          }
        }

        // Send to coach
        if (coach?.email) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: coach.email,
              subject: `Reminder: Coaching session tomorrow at ${format(scheduledAt, "h:mm a")}`,
              react: SessionReminderEmail({
                recipientName: coach.full_name || "there",
                otherPartyName: client?.full_name || "your client",
                scheduledDate: format(scheduledAt, "EEEE, MMMM d"),
                scheduledTime: format(scheduledAt, "h:mm a"),
                duration: session.duration_minutes,
                isCoach: true,
              }),
            });
            results.sessionReminders++;
          } catch (err) {
            results.errors.push(`Session reminder (coach) failed: ${err}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send reminders", details: results },
      { status: 500 }
    );
  }
}

function formatStepType(type: string): string {
  const types: Record<string, string> = {
    phone_screen: "Phone Screen",
    technical: "Technical Interview",
    behavioral: "Behavioral Interview",
    onsite: "Onsite Interview",
    offer: "Offer Discussion",
    other: "Interview",
  };
  return types[type] || type;
}
