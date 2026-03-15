import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { ContactDTO } from "@/types";
import {
  compareText,
  type BulkEditField,
  type SortKey,
  type SortState,
} from "@/components/contacts/contacts-table-shared";
import { deleteContactsBulk, updateContactsBulk } from "@/hooks/contacts-table/contacts-table-api";
import {
  buildBulkEditValues,
  buildBulkUpdates,
} from "@/hooks/contacts-table/contacts-table-utils";
import { useContactsTableResize } from "@/hooks/contacts-table/use-contacts-table-resize";

export function useContactsTable(contacts: ContactDTO[]) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [isEditingBulk, setIsEditingBulk] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<BulkEditField | "">("");
  const [bulkEditValues, setBulkEditValues] = useState<Record<string, string>>({});

  const [isCompact, setIsCompact] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [customerTypeFilter, setCustomerTypeFilter] = useState<ContactDTO["customerType"] | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ContactDTO["contactSource"] | "all">("all");
  const { columnWidths, startResize } = useContactsTableResize();

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

  const visibleIdSet = useMemo(
    () => new Set(visibleContacts.map((contact) => contact.id)),
    [visibleContacts]
  );

  const selectedVisibleCount = useMemo(
    () => selectedIds.filter((id) => visibleIdSet.has(id)).length,
    [selectedIds, visibleIdSet]
  );

  const allSelected = useMemo(
    () => visibleContacts.length > 0 && selectedVisibleCount === visibleContacts.length,
    [selectedVisibleCount, visibleContacts.length]
  );

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.includes(contact.id)),
    [contacts, selectedIds]
  );

  const hasActiveFilters = customerTypeFilter !== "all" || sourceFilter !== "all";

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
      const deleted = await deleteContactsBulk(selectedIds);
      toast({
        title: "Bulk delete completed",
        description: `${deleted} contact(s) deleted successfully.`,
      });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk delete failed",
        description: error instanceof Error ? error.message : "Unable to delete selected contacts",
      });
    } finally {
      setIsDeletingBulk(false);
    }
  }

  async function handleBulkEdit() {
    if (selectedIds.length === 0) {
      return;
    }

    if (!bulkEditField) {
      toast({
        variant: "destructive",
        title: "Field is required",
        description: "Please choose one field to edit.",
      });
      return;
    }

    const updates = buildBulkUpdates(selectedContacts, bulkEditField, bulkEditValues);

    if (updates.length === 0) {
      toast({
        variant: "destructive",
        title: "No changes detected",
        description: "Please update at least one selected row.",
      });
      return;
    }

    setIsEditingBulk(true);
    try {
      const updated = await updateContactsBulk(bulkEditField, updates);
      toast({
        title: "Bulk edit completed",
        description: `${updated} contact(s) updated successfully.`,
      });

      setBulkEditOpen(false);
      setBulkEditField("");
      setBulkEditValues({});
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Bulk edit failed",
        description: error instanceof Error ? error.message : "Unable to update selected contacts",
      });
    } finally {
      setIsEditingBulk(false);
    }
  }

  function handleOpenBulkEdit() {
    if (selectedVisibleCount === 0) {
      return;
    }

    setBulkEditField("");
    setBulkEditValues({});
    setBulkEditOpen(true);
  }

  function handleBulkFieldChange(value: string) {
    const nextField = value as BulkEditField;
    setBulkEditField(nextField);
    setBulkEditValues(buildBulkEditValues(selectedContacts, nextField));
  }

  function setBulkEditValue(id: string, value: string) {
    setBulkEditValues((prev) => ({
      ...prev,
      [id]: value,
    }));
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

  function clearFilters() {
    setCustomerTypeFilter("all");
    setSourceFilter("all");
  }

  return {
    allSelected,
    bulkDeleteOpen,
    bulkEditField,
    bulkEditOpen,
    bulkEditValues,
    columnWidths,
    customerTypeFilter,
    hasActiveFilters,
    isCompact,
    isDeletingBulk,
    isEditingBulk,
    selectedContacts,
    selectedIds,
    selectedVisibleCount,
    sort,
    sourceFilter,
    visibleContacts,
    setBulkDeleteOpen,
    setBulkEditOpen,
    setCustomerTypeFilter,
    setIsCompact,
    setSourceFilter,
    clearFilters,
    handleBulkDelete,
    handleBulkEdit,
    handleBulkFieldChange,
    handleOpenBulkEdit,
    setBulkEditValue,
    startResize,
    toggleAll,
    toggleOne,
    toggleSort,
  };
}
