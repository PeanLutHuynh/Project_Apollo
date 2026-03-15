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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContactDTO } from "@/types";
import {
  bulkFieldLabel,
  contactFieldDisplayValue,
  type BulkEditField,
} from "./contacts-table-shared";

type ContactsTableBulkEditDialogProps = {
  open: boolean;
  selectedContacts: ContactDTO[];
  selectedVisibleCount: number;
  bulkEditField: BulkEditField | "";
  bulkEditValues: Record<string, string>;
  isEditingBulk: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkFieldChange: (value: string) => void;
  onValueChange: (id: string, value: string) => void;
  onApply: () => void;
};

export function ContactsTableBulkEditDialog({
  open,
  selectedContacts,
  selectedVisibleCount,
  bulkEditField,
  bulkEditValues,
  isEditingBulk,
  onOpenChange,
  onBulkFieldChange,
  onValueChange,
  onApply,
}: ContactsTableBulkEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Selected Contacts</DialogTitle>
          <DialogDescription>
            Choose one field, then update values per selected contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <p className="text-sm font-medium">Field to edit</p>
            <Select value={bulkEditField || undefined} onValueChange={onBulkFieldChange}>
              <SelectTrigger className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select one field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customerType">Customer Type</SelectItem>
                <SelectItem value="contactSource">Source</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="notes">Notes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bulkEditField && (
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Current {bulkFieldLabel(bulkEditField)}</TableHead>
                    <TableHead>New {bulkFieldLabel(bulkEditField)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {contactFieldDisplayValue(contact, bulkEditField)}
                      </TableCell>
                      <TableCell>
                        {bulkEditField === "customerType" ? (
                          <Select
                            value={bulkEditValues[contact.id] ?? "personal"}
                            onValueChange={(value) => onValueChange(contact.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                              <SelectItem value="partner">Partner</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : bulkEditField === "contactSource" ? (
                          <Select
                            value={bulkEditValues[contact.id] ?? "other"}
                            onValueChange={(value) => onValueChange(contact.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="zalo">Zalo</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={bulkEditValues[contact.id] ?? ""}
                            onChange={(event) => onValueChange(contact.id, event.target.value)}
                            placeholder={`Enter new ${bulkFieldLabel(bulkEditField).toLowerCase()}`}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={selectedVisibleCount === 0 || isEditingBulk}>
            {isEditingBulk ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
