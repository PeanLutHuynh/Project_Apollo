import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ContactsTableToolbarProps = {
  selectedVisibleCount: number;
  isDeletingBulk: boolean;
  isEditingBulk: boolean;
  visibleCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  isCompact: boolean;
  onOpenBulkDelete: () => void;
  onOpenBulkEdit: () => void;
  onClearFilters: () => void;
  onToggleDensity: () => void;
};

export function ContactsTableToolbar({
  selectedVisibleCount,
  isDeletingBulk,
  isEditingBulk,
  visibleCount,
  totalCount,
  hasActiveFilters,
  isCompact,
  onOpenBulkDelete,
  onOpenBulkEdit,
  onClearFilters,
  onToggleDensity,
}: ContactsTableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={selectedVisibleCount === 0 || isDeletingBulk}
          onClick={onOpenBulkDelete}
        >
          {isDeletingBulk ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              {selectedVisibleCount > 0
                ? `Delete ${selectedVisibleCount} contact(s)`
                : "Delete Selected"}
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedVisibleCount === 0 || isEditingBulk}
          onClick={onOpenBulkEdit}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {selectedVisibleCount > 0 ? `Edit ${selectedVisibleCount} contact(s)` : "Edit Selected"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Showing {visibleCount} of {totalCount}
        </p>

        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}

        <Button
          type="button"
          variant={isCompact ? "default" : "outline"}
          size="sm"
          onClick={onToggleDensity}
        >
          {isCompact ? "Comfortable Density" : "Compact Density"}
        </Button>
      </div>
    </div>
  );
}
