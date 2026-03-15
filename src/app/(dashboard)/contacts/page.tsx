import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContacts } from "@/services/contact.service";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactsSearchBar from "@/components/contacts/ContactsSearchBar";
import ExportContactsButton from "@/components/contacts/ExportContactsButton";

export const metadata = { title: "Contacts" };

interface ContactsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { page: pageParam, search } = await searchParams;
  const page = Number(pageParam ?? 1);

  const { items: contacts, total, totalPages } =
    await getContacts(session.user.id, page, 20, search);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} contact{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportContactsButton />
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <ContactsSearchBar initialSearch={search ?? ""} />

      {/* Table */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No contacts found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term" : "Add your first contact to get started"}
          </p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/contacts/new">Add Contact</Link>
            </Button>
          )}
        </div>
      ) : (
        <ContactsTable contacts={contacts} />
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
                <Link href={`/contacts?page=${page - 1}${search ? `&search=${search}` : ""}`}>
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/contacts?page=${page + 1}${search ? `&search=${search}` : ""}`}>
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
