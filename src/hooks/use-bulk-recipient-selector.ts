import { useEffect, useMemo, useRef, useState } from "react";
import { useRecipientSearch, type RecipientOption } from "@/hooks/use-recipient-search";

type ConfirmAction = "deselect-visible" | "clear-selected" | null;

type UseBulkRecipientSelectorOptions = {
  onSelectionChange: (ids: string[]) => void;
};

export function useBulkRecipientSelector({
  onSelectionChange,
}: UseBulkRecipientSelectorOptions) {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const { query, setQuery, results, isLoading } = useRecipientSearch(50, isSuggestionsOpen);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, RecipientOption>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const recipientBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!recipientBoxRef.current) {
        return;
      }

      if (!recipientBoxRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const visibleIds = useMemo(() => results.map((contact) => contact.id), [results]);

  const selectedRecipientList = useMemo(
    () => selectedIds
      .map((id) => selectedRecipients[id])
      .filter((value): value is RecipientOption => Boolean(value)),
    [selectedIds, selectedRecipients]
  );

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  function updateSelection(nextIds: string[]) {
    setSelectedIds(nextIds);
    onSelectionChange(nextIds);
  }

  function applyToggleAll(allVisibleSelected: boolean) {
    const nextIds = allVisibleSelected      ? selectedIds.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...selectedIds, ...visibleIds]));

    setSelectedRecipients((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        visibleIds.forEach((id) => delete next[id]);
      } else {
        results.forEach((recipient) => {
          next[recipient.id] = recipient;
        });
      }
      return next;
    });

    updateSelection(nextIds);
  }

  function toggleAll() {
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allVisibleSelected && selectedIds.length > 0) {
      setConfirmAction("deselect-visible");
      return;
    }

    applyToggleAll(allVisibleSelected);
  }

  function toggleContact(id: string) {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];

    const picked = results.find((contact) => contact.id === id);
    setSelectedRecipients((prev) => {
      const next = { ...prev };
      if (nextIds.includes(id) && picked) {
        next[id] = picked;
      } else {
        delete next[id];
      }
      return next;
    });

    updateSelection(nextIds);
  }

  function removeSelectedRecipient(id: string) {
    const nextIds = selectedIds.filter((selectedId) => selectedId !== id);
    setSelectedRecipients((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    updateSelection(nextIds);
  }

  function clearSelectedRecipients() {
    if (selectedIds.length === 0) {
      return;
    }

    setSelectedRecipients({});
    updateSelection([]);
  }

  function onConfirmAction() {
    if (confirmAction === "deselect-visible") {
      applyToggleAll(true);
    }

    if (confirmAction === "clear-selected") {
      clearSelectedRecipients();
    }

    setConfirmAction(null);
  }

  function openClearSelectedConfirm() {
    setIsSuggestionsOpen(false);
    setConfirmAction("clear-selected");
  }

  function reset() {
    updateSelection([]);
    setSelectedRecipients({});
    setQuery("");
    setIsSuggestionsOpen(false);
    setConfirmAction(null);
  }

  return {
    allSelected,
    confirmAction,
    isLoading,
    isSuggestionsOpen,
    query,
    recipientBoxRef,
    results,
    selectedCount: selectedIds.length,
    selectedIds,
    selectedRecipientList,
    setConfirmAction,
    setIsSuggestionsOpen,
    setQuery,
    onConfirmAction,
    openClearSelectedConfirm,
    removeSelectedRecipient,
    reset,
    toggleAll,
    toggleContact,
  };
}
