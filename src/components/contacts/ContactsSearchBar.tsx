"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ContactsSearchBarProps = {
  initialSearch: string;
};

const SEARCH_DEBOUNCE_MS = 300;

export default function ContactsSearchBar({ initialSearch }: ContactsSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(initialSearch);

  const currentSearchParam = useMemo(
    () => searchParams.get("search") ?? "",
    [searchParams]
  );

  useEffect(() => {
    setSearchValue(currentSearchParam);
  }, [currentSearchParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchValue.trim();
      if (nextSearch === currentSearchParam) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }

      // When search changes, always return to first page.
      params.delete("page");

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchValue, currentSearchParam, pathname, router, searchParams]);

  function onRefresh() {
    setSearchValue("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          placeholder="Search by name, email, or phone..."
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="pl-9"
        />
      </div>
      <Button variant="outline" type="button" onClick={onRefresh}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}
