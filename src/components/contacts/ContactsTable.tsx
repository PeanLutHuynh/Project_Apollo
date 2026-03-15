"use client";

import { useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ContactDTO } from "@/types";
import { useContactsTable } from "@/hooks/use-contacts-table";
import { ContactsTableBulkDeleteDialog } from "./ContactsTableBulkDeleteDialog";
import { ContactsTableBulkEditDialog } from "./ContactsTableBulkEditDialog";
import { ContactsTableFilters } from "./ContactsTableFilters";
import { ContactsTableGrid } from "./ContactsTableGrid";
import { ContactsTableToolbar } from "./ContactsTableToolbar";

type ContactsTableProps = {
  contacts: ContactDTO[];
};

export default function ContactsTable({ contacts }: ContactsTableProps) {
  const table = useContactsTable(contacts);
  const tableRootRef = useRef<HTMLDivElement | null>(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

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
      if (!scrollContainer || scrollContainer.scrollWidth <= scrollContainer.clientWidth) {
        return;
      }

      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      scrollContainer.scrollLeft += delta;
    };

    window.addEventListener("wheel", onWindowWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWindowWheel);
  }, [isHeaderHovered]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <ContactsTableFilters
          customerTypeFilter={table.customerTypeFilter}
          sourceFilter={table.sourceFilter}
          onCustomerTypeChange={table.setCustomerTypeFilter}
          onSourceChange={table.setSourceFilter}
        />

        <ContactsTableToolbar
          selectedVisibleCount={table.selectedVisibleCount}
          isDeletingBulk={table.isDeletingBulk}
          isEditingBulk={table.isEditingBulk}
          visibleCount={table.visibleContacts.length}
          totalCount={contacts.length}
          hasActiveFilters={table.hasActiveFilters}
          isCompact={table.isCompact}
          onOpenBulkDelete={() => table.setBulkDeleteOpen(true)}
          onOpenBulkEdit={table.handleOpenBulkEdit}
          onClearFilters={table.clearFilters}
          onToggleDensity={() => table.setIsCompact((prev) => !prev)}
        />

        <div ref={tableRootRef}>
          <ContactsTableGrid
            visibleContacts={table.visibleContacts}
            selectedIds={table.selectedIds}
            allSelected={table.allSelected}
            isCompact={table.isCompact}
            columnWidths={table.columnWidths}
            sort={table.sort}
            onToggleAll={table.toggleAll}
            onToggleOne={table.toggleOne}
            onHeaderHoverChange={setIsHeaderHovered}
            onStartResize={table.startResize}
            onToggleSort={table.toggleSort}
          />
        </div>

        <ContactsTableBulkDeleteDialog
          open={table.bulkDeleteOpen}
          selectedVisibleCount={table.selectedVisibleCount}
          isDeletingBulk={table.isDeletingBulk}
          onOpenChange={table.setBulkDeleteOpen}
          onDelete={table.handleBulkDelete}
        />

        <ContactsTableBulkEditDialog
          open={table.bulkEditOpen}
          selectedContacts={table.selectedContacts}
          selectedVisibleCount={table.selectedVisibleCount}
          bulkEditField={table.bulkEditField}
          bulkEditValues={table.bulkEditValues}
          isEditingBulk={table.isEditingBulk}
          onOpenChange={table.setBulkEditOpen}
          onBulkFieldChange={table.handleBulkFieldChange}
          onValueChange={table.setBulkEditValue}
          onApply={table.handleBulkEdit}
        />
      </div>
    </TooltipProvider>
  );
}
