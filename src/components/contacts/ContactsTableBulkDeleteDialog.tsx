import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ContactsTableBulkDeleteDialogProps = {
  open: boolean;
  selectedVisibleCount: number;
  isDeletingBulk: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};

export function ContactsTableBulkDeleteDialog({
  open,
  selectedVisibleCount,
  isDeletingBulk,
  onOpenChange,
  onDelete,
}: ContactsTableBulkDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Selected Contacts</DialogTitle>
          <DialogDescription>
            This action cannot be undone. {selectedVisibleCount} selected contact(s) will be
            permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={selectedVisibleCount === 0 || isDeletingBulk}
          >
            {isDeletingBulk ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
