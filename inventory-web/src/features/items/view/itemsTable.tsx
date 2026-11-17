'use client';

import { ItemRow } from '@/features/items/components';
import { useItem } from '../queries/useItem';

export const ItemsTable = () => {
  const query = useItem();
  const items = query.data?.data ?? [];

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border/50 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40">
            <th className="px-6 py-3 text-left font-semibold text-foreground">Item</th>
            <th className="px-6 py-3 text-left font-semibold text-foreground">Model</th>
            <th className="px-6 py-3 text-left font-semibold text-foreground">Category</th>
            <th className="px-6 py-3 text-left font-semibold text-foreground">Brand</th>
            <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="w-12 h-12 text-muted-foreground/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-muted-foreground">No items found</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
