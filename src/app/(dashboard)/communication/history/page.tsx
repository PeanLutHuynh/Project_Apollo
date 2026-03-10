import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Mail, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCommunicationHistory } from "@/services/communication.service";
import { getInitials, formatDate, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Communication History" };

interface HistoryPageProps {
  searchParams: Promise<{ page?: string; type?: string }>;
}

const statusConfig = {
  pending: { icon: Clock, className: "text-yellow-500", label: "Pending" },
  sent: { icon: CheckCircle2, className: "text-blue-500", label: "Sent" },
  delivered: { icon: CheckCircle2, className: "text-green-500", label: "Delivered" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed" },
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { page: pageParam, type: typeParam } = await searchParams;
  const page = Number(pageParam ?? 1);
  const type = typeParam === "sms" || typeParam === "email" ? typeParam : undefined;

  const { items, total, totalPages } = await getCommunicationHistory(
    session.user.id,
    page,
    20,
    type
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Communication History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} message{total !== 1 ? "s" : ""} sent
          </p>
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          <Button
            variant={!type ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/communication/history">All</Link>
          </Button>
          <Button
            variant={type === "sms" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/communication/history?type=sms">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              SMS
            </Link>
          </Button>
          <Button
            variant={type === "email" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/communication/history?type=email">
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email
            </Link>
          </Button>
        </div>
      </div>

      {/* History list */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertCircle className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="text-lg">No messages found</p>
          <p className="text-sm mt-1">
            {type
              ? `No ${type.toUpperCase()} messages sent yet`
              : "No messages have been sent yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const StatusIcon = statusConfig[item.status]?.icon ?? Clock;
            const statusClass = statusConfig[item.status]?.className ?? "";
            const statusLabel = statusConfig[item.status]?.label ?? item.status;

            return (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                {/* Contact avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {item.contact
                      ? getInitials(item.contact.fullName)
                      : "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {item.contact?.fullName ?? "Unknown Contact"}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                      >
                        {item.type === "sms" ? (
                          <MessageSquare className="h-3 w-3" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                        {item.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", statusClass)} />
                      <span className={cn("text-xs font-medium", statusClass)}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {item.subject && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Subject: {item.subject}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {truncate(item.message, 120)}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      To: {item.recipient}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {item.errorMsg && (
                    <p className="text-xs text-destructive mt-1">
                      Error: {item.errorMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/communication/history?page=${page - 1}${type ? `&type=${type}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/communication/history?page=${page + 1}${type ? `&type=${type}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
