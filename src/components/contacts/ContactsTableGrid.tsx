import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContactDTO } from "@/types";
import {
  type ResizableColumn,
  type SortKey,
  type SortState,
} from "./contacts-table-shared";
import { ContactsTableRow } from "./ContactsTableRow";

type ContactsTableGridProps = {
  visibleContacts: ContactDTO[];
  selectedIds: string[];
  allSelected: boolean;
  isCompact: boolean;
  columnWidths: Record<ResizableColumn, number>;
  sort: SortState;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
  onHeaderHoverChange: (hovered: boolean) => void;
  onStartResize: (event: MouseEvent<HTMLSpanElement>, key: ResizableColumn) => void;
  onToggleSort: (key: SortKey) => void;
};

function sortIcon(sort: SortState, key: SortKey) {
  if (sort.key !== key) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  }

  if (sort.direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5 text-primary" />;
  }

  return <ArrowDown className="h-3.5 w-3.5 text-primary" />;
}

type ResizableHeadCellProps = {
  label: string;
  column: ResizableColumn;
  columnWidths: Record<ResizableColumn, number>;
  onStartResize: (event: MouseEvent<HTMLSpanElement>, key: ResizableColumn) => void;
  className?: string;
  sortableKey?: SortKey;
  sort: SortState;
  onToggleSort: (key: SortKey) => void;
};

function ResizableHeadCell({
  label,
  column,
  columnWidths,
  onStartResize,
  className,
  sortableKey,
  sort,
  onToggleSort,
}: ResizableHeadCellProps) {
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
            onClick={() => onToggleSort(sortableKey)}
          >
            <span>{label}</span>
            {sortIcon(sort, sortableKey)}
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
        onMouseDown={(event) => onStartResize(event, column)}
      >
        <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border/90 transition-colors group-hover:bg-primary" />
      </span>
    </TableHead>
  );
}

export function ContactsTableGrid({
  visibleContacts,
  selectedIds,
  allSelected,
  isCompact,
  columnWidths,
  sort,
  onToggleAll,
  onToggleOne,
  onHeaderHoverChange,
  onStartResize,
  onToggleSort,
}: ContactsTableGridProps) {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table className="min-w-[1120px]">
        <TableHeader
          onMouseEnter={() => onHeaderHoverChange(true)}
          onMouseLeave={() => onHeaderHoverChange(false)}
        >
          <TableRow>
            <TableHead className="sticky left-0 z-30 w-12 min-w-[48px] bg-background">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
                aria-label="Select all contacts"
              />
            </TableHead>
            <ResizableHeadCell
              label="Name"
              column="name"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              className="sticky left-12 z-30 bg-background shadow-[8px_0_12px_-8px_rgba(0,0,0,0.28)]"
              sortableKey="name"
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Customer Type"
              column="customerType"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Source"
              column="source"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Phone"
              column="phone"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Email"
              column="email"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              sortableKey="email"
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Address"
              column="address"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              className="hidden xl:table-cell"
              sortableKey="address"
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <ResizableHeadCell
              label="Notes"
              column="notes"
              columnWidths={columnWidths}
              onStartResize={onStartResize}
              sort={sort}
              onToggleSort={onToggleSort}
            />
            <TableHead className="sticky right-0 z-20 w-[100px] min-w-[100px] bg-background text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {visibleContacts.map((contact, index) => (
            <ContactsTableRow
              key={contact.id}
              contact={contact}
              index={index}
              shouldVirtualizeRow={visibleContacts.length > 100}
              isCompact={isCompact}
              isSelected={selectedIds.includes(contact.id)}
              columnWidths={columnWidths}
              onToggleOne={onToggleOne}
              onOpenContact={(id) => router.push(`/contacts/${id}`)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
