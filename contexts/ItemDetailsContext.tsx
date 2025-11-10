'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ItemDetail {
  startDate: string;
  endDate: string;
  isIndefinite: boolean;
  comment: string;
  globalAccessType: 'indefinite' | 'duration';
}

interface ItemDetailsContextType {
  itemDetails: Record<string, ItemDetail>;
  setItemDetail: (itemId: string, detail: Partial<ItemDetail>) => void;
  setGlobalAccessType: (type: 'indefinite' | 'duration') => void;
  getItemDetail: (itemId: string) => ItemDetail | undefined;
  globalAccessType: 'indefinite' | 'duration';
}

const ItemDetailsContext = createContext<ItemDetailsContextType | undefined>(undefined);

export function ItemDetailsProvider({ children }: { children: ReactNode }) {
  const [itemDetails, setItemDetails] = useState<Record<string, ItemDetail>>({});
  const [globalAccessType, setGlobalAccessTypeState] = useState<'indefinite' | 'duration'>('duration');

  const setItemDetail = useCallback((itemId: string, detail: Partial<ItemDetail>) => {
    setItemDetails((prev) => {
      const existing = prev[itemId];
      const today = new Date().toISOString().split("T")[0];
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const defaultEndDate = oneYearLater.toISOString().split("T")[0];
      
      return {
        ...prev,
        [itemId]: {
          startDate: existing?.startDate || detail.startDate || today,
          endDate: existing?.endDate || detail.endDate || defaultEndDate,
          isIndefinite: detail.isIndefinite !== undefined ? detail.isIndefinite : (existing?.isIndefinite ?? (globalAccessType === "indefinite")),
          comment: detail.comment !== undefined ? detail.comment : (existing?.comment || ""),
          globalAccessType: detail.globalAccessType || globalAccessType,
        } as ItemDetail,
      };
    });
  }, [globalAccessType]);

  const setGlobalAccessType = useCallback((type: 'indefinite' | 'duration') => {
    setGlobalAccessTypeState(type);
    setItemDetails((prev) => {
      const updated: Record<string, ItemDetail> = {};
      Object.keys(prev).forEach((itemId) => {
        updated[itemId] = {
          ...prev[itemId],
          isIndefinite: type === 'indefinite',
          globalAccessType: type,
        };
      });
      return updated;
    });
  }, []);

  const getItemDetail = useCallback((itemId: string) => {
    return itemDetails[itemId];
  }, [itemDetails]);

  const value = {
    itemDetails,
    setItemDetail,
    setGlobalAccessType,
    getItemDetail,
    globalAccessType,
  };

  return <ItemDetailsContext.Provider value={value}>{children}</ItemDetailsContext.Provider>;
}

export function useItemDetails(): ItemDetailsContextType {
  const context = useContext(ItemDetailsContext);
  if (context === undefined) {
    throw new Error('useItemDetails must be used within an ItemDetailsProvider');
  }
  return context;
}

