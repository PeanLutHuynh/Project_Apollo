import { useRef, useState, type MouseEvent } from "react";
import {
  MAX_WIDTHS,
  MIN_WIDTHS,
  type ResizableColumn,
} from "@/components/contacts/contacts-table-shared";

const DEFAULT_COLUMN_WIDTHS: Record<ResizableColumn, number> = {
  name: 280,
  customerType: 120,
  source: 100,
  phone: 140,
  email: 200,
  address: 140,
  notes: 160,
};

export function useContactsTableResize() {
  const [columnWidths, setColumnWidths] = useState<Record<ResizableColumn, number>>(
    DEFAULT_COLUMN_WIDTHS
  );

  const resizingRef = useRef<{ key: ResizableColumn; startX: number; startWidth: number } | null>(
    null
  );

  function startResize(event: MouseEvent<HTMLSpanElement>, key: ResizableColumn) {
    event.preventDefault();
    event.stopPropagation();

    resizingRef.current = {
      key,
      startX: event.clientX,
      startWidth: columnWidths[key],
    };

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const current = resizingRef.current;
      if (!current) return;

      const delta = moveEvent.clientX - current.startX;
      const nextWidth = Math.min(
        MAX_WIDTHS[current.key],
        Math.max(MIN_WIDTHS[current.key], current.startWidth + delta)
      );

      setColumnWidths((prev) => ({
        ...prev,
        [current.key]: nextWidth,
      }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return { columnWidths, startResize };
}
