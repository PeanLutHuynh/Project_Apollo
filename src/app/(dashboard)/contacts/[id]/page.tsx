import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getContactById } from "@/services/contact.service";
import { getInitials, formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

const ContactForm = dynamic(
  () => import("@/components/contacts/ContactForm"),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    ),
  }
);

export default async function ContactDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const contact = await getContactById(id, session.user.id);
  if (!contact) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Contact header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
            {getInitials(contact.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{contact.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            Added {formatDate(contact.createdAt)}
          </p>
          <Badge variant="outline" className="mt-1 text-xs">Contact</Badge>
        </div>
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
          <CardDescription>
            Update the details for this contact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm defaultValues={contact} contactId={contact.id} />
        </CardContent>
      </Card>
    </div>
  );
}
