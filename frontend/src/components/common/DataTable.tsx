import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  // Mobile card layout: render function for card view (shown on mobile)
  renderCard?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  pageSize?: number;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  // Enable mobile card layout fallback (default: true)
  mobileCards?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 10,
  emptyMessage = 'No records found.',
  emptyActionLabel,
  onEmptyAction,
  className = '',
  onRowClick,
  isLoading = false,
  mobileCards = true,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) {
      return data;
    }
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => searchFilter(item, q));
  }, [data, searchQuery, searchFilter]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      return sortDirection === 'asc' ? 1 : -1;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {searchFilter && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            Showing {sortedData.length} total
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table aria-busy={isLoading || undefined}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div
                    className={`flex items-center gap-1.5 ${
                      col.sortable ? 'cursor-pointer hover:text-foreground' : ''
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [0, 1, 2].map((row) => (
                <TableRow key={`skeleton-${row}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="py-3">
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3"
                >
                  <span>{emptyMessage}</span>
                  {emptyActionLabel && onEmptyAction && (
                    <Button variant="outline" size="sm" onClick={onEmptyAction} className="gap-2">
                      {emptyActionLabel}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={(item as any).id || (item as any).credentialNumber || index}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`py-3 ${col.className || ''}`}>
                      {col.accessor ? col.accessor(item) : (item as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card layout fallback */}
      {mobileCards && columns.some((c) => c.renderCard) && (
        <div className="md:hidden space-y-3">
          {isLoading ? (
            [0, 1, 2].map((row) => (
              <div key={`skeleton-card-${row}`} className="rounded-xl border border-border bg-card p-4 space-y-2 animate-pulse">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : paginatedData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card space-y-3">
              <div className="text-muted-foreground">{emptyMessage}</div>
              {emptyActionLabel && onEmptyAction && (
                <Button variant="outline" size="sm" onClick={onEmptyAction} className="gap-2 mx-auto">
                  {emptyActionLabel}
                </Button>
              )}
            </div>
          ) : (
            paginatedData.map((item, index) => (
              <div
                key={(item as any).id || (item as any).credentialNumber || index}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
                onClick={() => onRowClick && onRowClick(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns
                  .filter((c) => c.renderCard)
                  .map((col) => col.renderCard!(item))}
              </div>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
