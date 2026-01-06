import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Briefcase,
  Target,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";

interface UpcomingStep {
  id: string;
  step_number: number;
  step_type: string;
  scheduled_date: string | null;
  recruitment_processes: {
    company_name: string;
    job_title: string;
  } | null;
}

interface RecentProcess {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch statistics
  const [
    experiencesResult,
    processesResult,
    connectionsResult,
    stepsResult,
    recentResult,
  ] = await Promise.all([
    supabase.from("career_experiences").select("*", { count: "exact", head: true }),
    supabase.from("recruitment_processes").select("*", { count: "exact", head: true }),
    supabase.from("network_connections").select("*", { count: "exact", head: true }),
    supabase
      .from("process_steps")
      .select(`
        id,
        step_number,
        step_type,
        scheduled_date,
        recruitment_processes (
          company_name,
          job_title
        )
      `)
      .eq("status", "upcoming")
      .order("scheduled_date", { ascending: true })
      .limit(5),
    supabase
      .from("recruitment_processes")
      .select("id, company_name, job_title, status")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const experiencesCount = experiencesResult.count;
  const processesCount = processesResult.count;
  const connectionsCount = connectionsResult.count;
  const upcomingSteps = (stepsResult.data || []) as unknown as UpcomingStep[];
  const recentProcesses = (recentResult.data || []) as RecentProcess[];

  const activeProcessesCount = await supabase
    .from("recruitment_processes")
    .select("*", { count: "exact", head: true })
    .eq("status", "in_progress");

  const stats = [
    {
      name: "Career Experiences",
      value: experiencesCount || 0,
      icon: Briefcase,
      href: "/journey",
      color: "text-blue-600 bg-blue-100",
    },
    {
      name: "Active Processes",
      value: activeProcessesCount.count || 0,
      icon: Target,
      href: "/processes",
      color: "text-green-600 bg-green-100",
    },
    {
      name: "Network Connections",
      value: connectionsCount || 0,
      icon: Users,
      href: "/network",
      color: "text-purple-600 bg-purple-100",
    },
    {
      name: "Total Applications",
      value: processesCount || 0,
      icon: TrendingUp,
      href: "/processes",
      color: "text-orange-600 bg-orange-100",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700";
      case "offer_received":
        return "bg-green-100 text-green-700";
      case "accepted":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Here&apos;s an overview of your career journey
          </p>
        </div>
        <Link href="/processes" className="w-full sm:w-auto">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Process
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                Upcoming Interviews
              </CardTitle>
              <CardDescription>Your next scheduled interview steps</CardDescription>
            </div>
            <Link href="/processes">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingSteps && upcomingSteps.length > 0 ? (
              <div className="space-y-4">
                {upcomingSteps.map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {step.recruitment_processes?.company_name}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {step.step_type?.replace("_", " ")} - {step.recruitment_processes?.job_title}
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex items-center gap-2 sm:block">
                      <p className="text-sm font-medium text-slate-900">
                        {step.scheduled_date
                          ? new Date(step.scheduled_date).toLocaleDateString()
                          : "Not scheduled"}
                      </p>
                      <Badge variant="secondary" className="sm:mt-1">
                        Step {step.step_number}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming interviews</p>
                <Link href="/processes">
                  <Button variant="link" className="mt-2">
                    Add a recruitment process
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent processes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-slate-600" />
                Recent Processes
              </CardTitle>
              <CardDescription>Your latest recruitment processes</CardDescription>
            </div>
            <Link href="/processes">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentProcesses && recentProcesses.length > 0 ? (
              <div className="space-y-4">
                {recentProcesses.map((process) => (
                  <div
                    key={process.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{process.company_name}</p>
                      <p className="text-sm text-slate-600 truncate">{process.job_title}</p>
                    </div>
                    <Badge className={getStatusColor(process.status)}>
                      {process.status?.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recruitment processes yet</p>
                <Link href="/processes">
                  <Button variant="link" className="mt-2">
                    Start tracking your first process
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
