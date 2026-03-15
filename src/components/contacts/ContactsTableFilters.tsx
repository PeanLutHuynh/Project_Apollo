import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContactDTO } from "@/types";
import { customerTypeLabel, sourceLabel } from "./contacts-table-shared";

type ContactsTableFiltersProps = {
  customerTypeFilter: ContactDTO["customerType"] | "all";
  sourceFilter: ContactDTO["contactSource"] | "all";
  onCustomerTypeChange: (value: ContactDTO["customerType"] | "all") => void;
  onSourceChange: (value: ContactDTO["contactSource"] | "all") => void;
};

export function ContactsTableFilters({
  customerTypeFilter,
  sourceFilter,
  onCustomerTypeChange,
  onSourceChange,
}: ContactsTableFiltersProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Customer Type:</span>
        {(["all", "enterprise", "personal", "partner"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={customerTypeFilter === value ? "default" : "outline"}
            className="h-7"
            onClick={() => onCustomerTypeChange(value)}
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
            onClick={() => onSourceChange(value)}
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
                onClick={() => onCustomerTypeChange("all")}
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
                onClick={() => onSourceChange("all")}
                aria-label="Remove source filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </>
  );
}
