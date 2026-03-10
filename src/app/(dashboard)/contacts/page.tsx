import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getContacts } from "@/services/contact.service";
import { getInitials, truncate } from "@/lib/utils";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";

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
        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form method="GET">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search by name, email, or phone..."
            defaultValue={search ?? ""}
            className="pl-9"
          />
        </div>
      </form>

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(contact.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{contact.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.phoneNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {truncate(contact.email, 30)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {contact.address ? truncate(contact.address, 30) : (
                      <Badge variant="outline" className="text-xs">No address</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/contacts/${contact.id}`}>Edit</Link>
                      </Button>
                      <DeleteContactButton id={contact.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
