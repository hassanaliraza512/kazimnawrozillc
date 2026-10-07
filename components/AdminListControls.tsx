"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 10;

export function useAdminList<T>(
  items: T[],
  getSearchText: (item: T) => string,
) {
  const [search, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      getSearchText(item).toLocaleLowerCase().includes(query),
    );
  }, [getSearchText, items, search]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visibleItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage !== page) setCurrentPage(page);
  }, [currentPage, page]);

  function setSearch(value: string) {
    setSearchValue(value);
    setCurrentPage(1);
  }

  return {
    search,
    setSearch,
    currentPage: page,
    setCurrentPage,
    filteredItems,
    visibleItems,
    pageCount,
  };
}

type AdminListControlsProps = {
  search: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  placeholder: string;
};

export function AdminListControls({
  search,
  onSearchChange,
  totalCount,
  currentPage,
  pageCount,
  onPageChange,
  placeholder,
}: AdminListControlsProps) {
  const start = totalCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="relative block w-full max-w-sm">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-md border border-[var(--line)] bg-white py-2.5 pl-9 pr-3 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span aria-live="polite">
          {totalCount ? `Showing ${start}–${end} of ${totalCount}` : "0 results"}
        </span>
        <nav className="flex items-center gap-1" aria-label="List pages">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded border border-[var(--line)] bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded border border-[var(--line)] bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
