import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, MessageSquare, Mail, TrendingUp, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getContactCount } from "@/services/contact.service";
import { getRecentCommunicationsCount } from "@/services/communication.service";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [contactCount, todayCount, weekCount] = await Promise.all([
    getContactCount(session.user.id),
    getRecentCommunicationsCount(session.user.id, 1),
    getRecentCommunicationsCount(session.user.id, 7),
  ]);

  const stats = [
    {
      title: "Total Contacts",
      value: contactCount,
      description: "Contacts in your list",
      icon: Users,
      href: "/contacts",
    },
    {
      title: "Messages Today",
      value: todayCount,
      description: "SMS + Emails sent today",
      icon: MessageSquare,
      href: "/communication/history",
    },
    {
      title: "Messages This Week",
      value: weekCount,
      description: "Past 7 days activity",
      icon: TrendingUp,
      href: "/communication/history",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>
        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Manage Contacts
              </CardTitle>
              <CardDescription className="text-xs">
                View, add, and edit your contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/contacts">View Contacts</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Send SMS
              </CardTitle>
              <CardDescription className="text-xs">
                Send text messages to contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/communication/sms">Send SMS</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Send Email
              </CardTitle>
              <CardDescription className="text-xs">
                Send emails to your contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/communication/email">Send Email</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
