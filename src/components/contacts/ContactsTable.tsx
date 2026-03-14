"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { useToast } from "@/hooks/use-toast";
import { getInitials, truncate } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ContactDTO } from "@/types";

type ContactsTableProps = {
  contacts: ContactDTO[];
};

type ResizableColumn =
  | "name"
  | "customerType"
  | "source"
  | "phone"
  | "email"
  | "address"
  | "notes";

type SortKey = "name" | "email" | "address";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const MIN_WIDTHS: Record<ResizableColumn, number> = {
  name: 160,
  customerType: 120,
  source: 100,
  phone: 140,
  email: 200,
  address: 140,
  notes: 160,
};

const MAX_WIDTHS: Record<ResizableColumn, number> = {
  name: 480,
  customerType: 180,
  source: 170,
  phone: 210,
  email: 360,
  address: 260,
  notes: 300,
};

function customerTypeLabel(value: ContactDTO["customerType"]): string {
  if (value === "enterprise") return "Enterprise";
  if (value === "partner") return "Partner";
  return "Personal";
}

function sourceLabel(value: ContactDTO["contactSource"]): string {
  if (value === "facebook") return "Facebook";
  if (value === "zalo") return "Zalo";
  if (value === "staff") return "Staff";
  return "Other";
}

function customerTypeBadgeClass(value: ContactDTO["customerType"]): string {
  if (value === "enterprise") {
    return "border-blue-300/40 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (value === "partner") {
    return "border-violet-300/40 bg-violet-500/15 text-violet-700 dark:text-violet-300";
  }

  return "border-amber-300/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export default function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [customerTypeFilter, setCustomerTypeFilter] = useState<ContactDTO["customerType"] | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ContactDTO["contactSource"] | "all">("all");
  const [columnWidths, setColumnWidths] = useState<Record<ResizableColumn, number>>({
    name: 280,
    customerType: 120,
    source: 100,
    phone: 140,
    email: 200,
    address: 140,
    notes: 160,
  });
  const resizingRef = useRef<{
    key: ResizableColumn;
    startX: number;
    startWidth: number;
  } | null>(null);
  const tableRootRef = useRef<HTMLDivElement | null>(null);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const customerTypeMatch =
        customerTypeFilter === "all" || contact.customerType === customerTypeFilter;
      const sourceMatch = sourceFilter === "all" || contact.contactSource === sourceFilter;

      return customerTypeMatch && sourceMatch;
    });
  }, [contacts, customerTypeFilter, sourceFilter]);

  const visibleContacts = useMemo(() => {
    const data = [...filteredContacts];
    data.sort((a, b) => {
      let result = 0;

      if (sort.key === "name") {
        result = compareText(a.fullName, b.fullName);
      } else if (sort.key === "email") {
        result = compareText(a.email, b.email);
      } else {
        result = compareText(a.address ?? "", b.address ?? "");
      }

      return sort.direction === "asc" ? result : -result;
    });

    return data;
  }, [filteredContacts, sort]);

  const visibleIdSet = useMemo(() => new Set(visibleContacts.map((contact) => contact.id)), [visibleContacts]);
  const selectedVisibleCount = useMemo(
    () => selectedIds.filter((id) => visibleIdSet.has(id)).length,
    [selectedIds, visibleIdSet]
  );

  const allSelected = useMemo(
    () => visibleContacts.length > 0 && selectedVisibleCount === visibleContacts.length,
    [selectedVisibleCount, visibleContacts.length]
  );

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
      return;
    }

    const next = new Set(selectedIds);
    visibleContacts.forEach((contact) => next.add(contact.id));
    setSelectedIds(Array.from(next));
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await fetch("/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to delete selected contacts");
      }

      const deleted = payload.data?.deleted ?? 0;
      toast({
        title: "Bulk delete completed",
        description: `${deleted} contact(s) deleted successfully.`,
      });
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete selected contacts",
      });
    } finally {
      setIsDeletingBulk(false);
    }
  }

  function startResize(event: React.MouseEvent<HTMLSpanElement>, key: ResizableColumn) {
    event.preventDefault();
    event.stopPropagation();

    resizingRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const current = resizingRef.current;
      if (!current) return;

      const delta = moveEvent.clientX - current.startX;
      const nextWidth = Math.min(
        MAX_WIDTHS[current.key],
        Math.max(MIN_WIDTHS[current.key], current.startWidth + delta)
      );

      setColumnWidths((prev) => ({
        ...prev,
        [current.key]: nextWidth,
      }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  }

  useEffect(() => {
    if (!isHeaderHovered) {
      return;
    }

    const onWindowWheel = (event: WheelEvent) => {
      const root = tableRootRef.current;
      if (!root) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isWheelOnHeader = Boolean(target?.closest("thead"));
      if (!isWheelOnHeader) {
        return;
      }

      const scrollContainer = root.querySelector("div.overflow-auto") as HTMLElement | null;
      if (!scrollContainer) {
        return;
      }

      const canScrollHorizontally =
        scrollContainer.scrollWidth > scrollContainer.clientWidth;
      if (!canScrollHorizontally) {
        return;
      }

      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
      scrollContainer.scrollLeft += delta;
    };

    window.addEventListener("wheel", onWindowWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWindowWheel);
  }, [isHeaderHovered]);

  function sortIcon(key: SortKey) {
    if (sort.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    if (sort.direction === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
    }

    return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  }

  function ResizableHead({
    label,
    column,
    className,
    sortableKey,
  }: {
    label: string;
    column: ResizableColumn;
    className?: string;
    sortableKey?: SortKey;
  }) {
    return (
      <TableHead
        className={`relative ${className ?? ""}`}
        style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
      >
        <div className="pr-3">
          {sortableKey ? (
            <button
              type="button"
              className="flex items-center gap-1.5 font-medium hover:text-foreground"
              onClick={() => toggleSort(sortableKey)}
            >
              <span>{label}</span>
              {sortIcon(sortableKey)}
            </button>
          ) : (
            <p>{label}</p>
          )}
          <p className="text-[10px] leading-4 text-muted-foreground"></p>
        </div>
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label} column`}
          className="group absolute right-0 top-0 h-full w-3 cursor-col-resize select-none"
          onMouseDown={(event) => startResize(event, column)}
        >
          <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border/90 transition-colors group-hover:bg-primary" />
        </span>
      </TableHead>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedVisibleCount > 0
            ? `${selectedVisibleCount} contact(s) selected`
            : "Select contacts to delete in bulk. Use mouse wheel on header to scroll horizontally"}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {visibleContacts.length} of {contacts.length}
          </p>
          {(customerTypeFilter !== "all" || sourceFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomerTypeFilter("all");
                setSourceFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Customer Type:</span>
        {(["all", "enterprise", "personal", "partner"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={customerTypeFilter === value ? "default" : "outline"}
            className="h-7"
            onClick={() => setCustomerTypeFilter(value)}
          >
            {value === "all" ? "All" : customerTypeLabel(value)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Source:</span>
        {(["all", "facebook", "zalo", "staff", "other"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={sourceFilter === value ? "default" : "outline"}
            className="h-7"
            onClick={() => setSourceFilter(value)}
          >
            {value === "all" ? "All" : sourceLabel(value)}
          </Button>
        ))}
      </div>

      {(customerTypeFilter !== "all" || sourceFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {customerTypeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {customerTypeLabel(customerTypeFilter)}
              <button
                type="button"
                className="ml-1"
                onClick={() => setCustomerTypeFilter("all")}
                aria-label="Remove customer type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sourceFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {sourceLabel(sourceFilter)}
              <button
                type="button"
                className="ml-1"
                onClick={() => setSourceFilter("all")}
                aria-label="Remove source filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={selectedVisibleCount === 0 || isDeletingBulk}
          onClick={handleBulkDelete}
        >
          {isDeletingBulk ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </>
          )}
        </Button>
        <Button
          type="button"
          variant={isCompact ? "default" : "outline"}
          size="sm"
          onClick={() => setIsCompact((prev) => !prev)}
        >
          {isCompact ? "Comfortable Density" : "Compact Density"}
        </Button>
      </div>

      <div ref={tableRootRef} className="rounded-md border">
        <Table className="min-w-[1120px]">
          <TableHeader
            onMouseEnter={() => setIsHeaderHovered(true)}
            onMouseLeave={() => setIsHeaderHovered(false)}
          >
            <TableRow>
              <TableHead className="sticky left-0 z-30 w-12 min-w-[48px] bg-background">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="Select all contacts"
                />
              </TableHead>
              <ResizableHead
                label="Name"
                column="name"
                sortableKey="name"
                className="sticky left-12 z-30 bg-background shadow-[8px_0_12px_-8px_rgba(0,0,0,0.28)]"
              />
              <ResizableHead label="Customer Type" column="customerType" />
              <ResizableHead label="Source" column="source" />
              <ResizableHead label="Phone" column="phone" />
              <ResizableHead label="Email" column="email" sortableKey="email" />
              <ResizableHead
                label="Address"
                column="address"
                sortableKey="address"
                className="hidden xl:table-cell"
              />
              <ResizableHead label="Notes" column="notes" />
              <TableHead className="sticky right-0 z-20 w-[100px] min-w-[100px] bg-background text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleContacts.map((contact, index) => (
              <TableRow
                key={contact.id}
                data-state={selectedIds.includes(contact.id) ? "selected" : ""}
                className={
                  index % 2 === 0
                    ? "group cursor-pointer bg-background hover:!bg-slate-100 dark:bg-slate-950 dark:hover:!bg-slate-800"
                    : "group cursor-pointer bg-slate-50 hover:!bg-slate-100 dark:bg-slate-900 dark:hover:!bg-slate-800"
                }
                onClick={() => router.push(`/contacts/${contact.id}`)}
                style={
                  visibleContacts.length > 100
                    ? { contentVisibility: "auto", containIntrinsicSize: "48px" }
                    : undefined
                }
              >
                {/* Sticky columns use opaque backgrounds to prevent text bleed-through in dark mode. */}
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} sticky left-0 z-20 ${
                    index % 2 === 0
                      ? "bg-background dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                      : "bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                  }`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={(checked) => toggleOne(contact.id, checked === true)}
                    aria-label={`Select ${contact.fullName}`}
                  />
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} sticky left-12 z-20 shadow-[8px_0_12px_-8px_rgba(0,0,0,0.28)] ${
                    index % 2 === 0
                      ? "bg-background dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                      : "bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                  }`}
                  style={{ width: columnWidths.name, minWidth: columnWidths.name }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className={isCompact ? "h-7 w-7" : "h-8 w-8"}>
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(contact.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium truncate">{contact.fullName}</span>
                      </TooltipTrigger>
                      <TooltipContent>{contact.fullName}</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                <TableCell
                  className={isCompact ? "py-2" : "py-4"}
                  style={{ width: columnWidths.customerType, minWidth: columnWidths.customerType }}
                >
                  <Badge
                    variant="outline"
                    className={`max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${customerTypeBadgeClass(contact.customerType)}`}
                  >
                    {customerTypeLabel(contact.customerType)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={isCompact ? "py-2" : "py-4"}
                  style={{ width: columnWidths.source, minWidth: columnWidths.source }}
                >
                  <Badge variant="outline" className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {sourceLabel(contact.contactSource)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} text-muted-foreground`}
                  style={{ width: columnWidths.phone, minWidth: columnWidths.phone }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block max-w-full truncate">{contact.phoneNumber}</span>
                    </TooltipTrigger>
                    <TooltipContent>{contact.phoneNumber}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} text-muted-foreground`}
                  style={{ width: columnWidths.email, minWidth: columnWidths.email }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block max-w-full truncate">{contact.email}</span>
                    </TooltipTrigger>
                    <TooltipContent>{contact.email}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} hidden xl:table-cell text-muted-foreground`}
                  style={{ width: columnWidths.address, minWidth: columnWidths.address }}
                >
                  {contact.address ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block max-w-full truncate">
                          {truncate(contact.address, 30)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{contact.address}</TooltipContent>
                    </Tooltip>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} text-muted-foreground`}
                  style={{ width: columnWidths.notes, minWidth: columnWidths.notes }}
                >
                  {contact.notes ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block max-w-full truncate">
                          {truncate(contact.notes, 24)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{contact.notes}</TooltipContent>
                    </Tooltip>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell
                  className={`${isCompact ? "py-2" : "py-4"} sticky right-0 z-10 text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)] ${
                    index % 2 === 0
                      ? "bg-background dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                      : "bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                  }`}
                  onClick={(event) => event.stopPropagation()}
                >
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
    </div>
    </TooltipProvider>
  );
}
