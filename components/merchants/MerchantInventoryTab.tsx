"use client";

import React from "react";
import { Package, AlertCircle, CheckCircle2, Tag } from "lucide-react";
import { formatMoney } from "@/lib/currency";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice?: number | null;
  sellingPrice: number;
  trackStock: boolean;
  totalStock: number;
  lowStockAlert: number;
  salesCount: number;
  isActive: boolean;
  createdAt: string;
}

interface MerchantInventoryTabProps {
  inventory: InventoryItem[];
  currency: string;
}

export function MerchantInventoryTab({ inventory, currency }: MerchantInventoryTabProps) {
  if (inventory.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs">
        <Package className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Inventory SKUs Recorded</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          This merchant has not cataloged physical products or synced retail inventory presets.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Retail Inventory Catalog ({inventory.length})
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          MongoDB: inventoryproducts
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4">SKU / Code</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock on Hand</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Units Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {inventory.map((item) => {
              const isOutOfStock = item.trackStock && item.totalStock <= 0;
              const isLowStock =
                item.trackStock && !isOutOfStock && item.totalStock <= (item.lowStockAlert || 5);

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {item.sku}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-300">
                    {item.category}
                  </td>
                  <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-semibold">
                    {formatMoney(item.sellingPrice, currency)}
                  </td>
                  <td className="py-3 px-4">
                    {item.trackStock ? (
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.totalStock.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans text-[11px]">Untracked</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                        <AlertCircle className="w-3 h-3" />
                        <span>Out of Stock</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        <AlertCircle className="w-3 h-3 text-slate-500" />
                        <span>Low Stock</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>In Stock</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 font-medium">
                    {item.salesCount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

