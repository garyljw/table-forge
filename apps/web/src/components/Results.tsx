import type { ReactNode } from "react";
import { Pager } from "./Pager.js";

interface Page<T> {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
}

/** A page of results with paging, plus the empty and past-the-end cases every list needs. */
export function Results<T>({
  data,
  empty,
  onPage,
  children,
}: {
  data: Page<T>;
  empty: string;
  onPage: (page: number) => void;
  children: (items: T[]) => ReactNode;
}) {
  if (data.items.length === 0) {
    if (data.total > 0) {
      return (
        <div className="state">
          <p>No results on this page.</p>
          <button type="button" className="button-link" onClick={() => onPage(1)}>
            Back to page 1
          </button>
        </div>
      );
    }
    return <p className="state">{empty}</p>;
  }
  return (
    <>
      {children(data.items)}
      <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={onPage} />
    </>
  );
}
