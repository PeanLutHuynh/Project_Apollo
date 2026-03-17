import { Users, X } from "lucide-react";
import type { MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import ConfirmActionDialog from "@/components/communication/ConfirmActionDialog";
import type { RecipientOption } from "@/hooks/use-recipient-search";
import type { BulkRecipientSelectorConfirmAction } from "@/hooks/use-bulk-recipient-selector";

type RecipientPickerProps = {
  recipientBoxRef: MutableRefObject<HTMLDivElement | null>;
  query: string;
  isSuggestionsOpen: boolean;
  isLoading: boolean;
  results: RecipientOption[];
  selectedIds: string[];
  selectedRecipientList: RecipientOption[];
  selectedCount: number;
  allSelected: boolean;
  confirmAction: BulkRecipientSelectorConfirmAction;
  setQuery: (value: string) => void;
  setIsSuggestionsOpen: (value: boolean) => void;
  setConfirmAction: (value: BulkRecipientSelectorConfirmAction) => void;
  toggleAll: () => void;
  toggleContact: (id: string) => void;
  removeSelectedRecipient: (id: string) => void;
  openClearSelectedConfirm: () => void;
  onConfirmAction: () => void;
  placeholder: string;
  secondaryField: "phoneNumber" | "email";
};

export default function RecipientPicker({
  recipientBoxRef,
  query,
  isSuggestionsOpen,
  isLoading,
  results,
  selectedIds,
  selectedRecipientList,
  selectedCount,
  allSelected,
  confirmAction,
  setQuery,
  setIsSuggestionsOpen,
  setConfirmAction,
  toggleAll,
  toggleContact,
  removeSelectedRecipient,
  openClearSelectedConfirm,
  onConfirmAction,
  placeholder,
  secondaryField,
}: RecipientPickerProps) {
  return (
    <FormItem>
      <div className="flex items-center justify-between mb-2">
        <FormLabel>Recipients</FormLabel>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="secondary">
              <Users className="mr-1 h-3 w-3" />
              {selectedCount} selected
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAll}
            disabled={results.length === 0}
          >
            {allSelected ? "Deselect Visible" : "Select Visible"}
          </Button>
        </div>
      </div>

      <div ref={recipientBoxRef} className="space-y-2">
        <Input
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsSuggestionsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsSuggestionsOpen(true);
          }}
        />
        {isSuggestionsOpen && (
          <div className="h-48 overflow-y-auto rounded-md border p-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matching recipients
              </p>
            ) : (
              <div className="space-y-1">
                {results.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                    onClick={() => toggleContact(contact.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border border-input accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium flex-1">
                      {contact.fullName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {contact[secondaryField]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRecipientList.length > 0 && (
        <div className="rounded-md border p-2">
          <p className="text-xs text-muted-foreground mb-2">Selected recipients</p>
          <div className="flex flex-wrap gap-2">
            {selectedRecipientList.slice(0, 6).map((recipient) => (
              <Badge key={recipient.id} variant="secondary" className="gap-1">
                <span>{recipient.fullName}</span>
                <button
                  type="button"
                  onClick={() => removeSelectedRecipient(recipient.id)}
                  aria-label={`Remove ${recipient.fullName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedRecipientList.length > 6 && (
              <Badge variant="outline">+{selectedRecipientList.length - 6} more</Badge>
            )}
          </div>
        </div>
      )}

      {selectedRecipientList.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openClearSelectedConfirm();
            }}
            onClick={openClearSelectedConfirm}
          >
            Clear selected
          </Button>
        </div>
      )}

      <FormMessage />

      <ConfirmActionDialog
        open={confirmAction !== null}
        title={confirmAction === "deselect-visible" ? "Deselect Visible Recipients" : "Clear Selected Recipients"}
        description={
          confirmAction === "deselect-visible"
            ? "This will remove only recipients in the current search result from your selection."
            : `This will remove all ${selectedIds.length} selected recipient(s).`
        }
        confirmLabel={confirmAction === "deselect-visible" ? "Deselect Visible" : "Clear Selected"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={onConfirmAction}
      />
    </FormItem>
  );
}
