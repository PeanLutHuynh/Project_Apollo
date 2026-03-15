import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials, truncate } from "@/lib/utils";
import type { ContactDTO } from "@/types";
import {
  customerTypeBadgeClass,
  customerTypeLabel,
  sourceLabel,
  type ResizableColumn,
} from "./contacts-table-shared";

type ContactsTableRowProps = {
  contact: ContactDTO;
  index: number;
  shouldVirtualizeRow: boolean;
  isCompact: boolean;
  isSelected: boolean;
  columnWidths: Record<ResizableColumn, number>;
  onToggleOne: (id: string, checked: boolean) => void;
  onOpenContact: (id: string) => void;
};

export function ContactsTableRow({
  contact,
  index,
  shouldVirtualizeRow,
  isCompact,
  isSelected,
  columnWidths,
  onToggleOne,
  onOpenContact,
}: ContactsTableRowProps) {
  const evenRow = index % 2 === 0;
  const rowClass = evenRow
    ? "group cursor-pointer bg-background hover:!bg-slate-100 dark:bg-slate-950 dark:hover:!bg-slate-800"
    : "group cursor-pointer bg-slate-50 hover:!bg-slate-100 dark:bg-slate-900 dark:hover:!bg-slate-800";
  const stickyBg = evenRow
    ? "bg-background dark:bg-slate-950 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
    : "bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800";

  return (
    <TableRow
      data-state={isSelected ? "selected" : ""}
      className={rowClass}
      onClick={() => onOpenContact(contact.id)}
      style={
        shouldVirtualizeRow ? { contentVisibility: "auto", containIntrinsicSize: "48px" } : undefined
      }
    >
      <TableCell
        className={`${isCompact ? "py-2" : "py-4"} sticky left-0 z-20 ${stickyBg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleOne(contact.id, checked === true)}
          aria-label={`Select ${contact.fullName}`}
        />
      </TableCell>

      <TableCell
        className={`${isCompact ? "py-2" : "py-4"} sticky left-12 z-20 shadow-[8px_0_12px_-8px_rgba(0,0,0,0.28)] ${stickyBg}`}
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
              <span className="block max-w-full truncate">{truncate(contact.address, 30)}</span>
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
              <span className="block max-w-full truncate">{truncate(contact.notes, 24)}</span>
            </TooltipTrigger>
            <TooltipContent>{contact.notes}</TooltipContent>
          </Tooltip>
        ) : (
          "-"
        )}
      </TableCell>

      <TableCell
        className={`${isCompact ? "py-2" : "py-4"} sticky right-0 z-10 text-right shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)] ${stickyBg}`}
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
  );
}
