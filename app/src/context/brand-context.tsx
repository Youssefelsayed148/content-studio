"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Brand } from "@/lib/types";

interface BrandContextValue {
  brands: Brand[];
  activeBrand: Brand | null;
  setActiveBrand: (brand: Brand) => void;
  loading: boolean;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

const STORAGE_KEY = "activeBrandId";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands");
      const data: Brand[] = await res.json();
      setBrands(data);

      // Restore active brand from localStorage or default to first
      const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedId) {
        const saved = data.find((b) => b.id === savedId);
        if (saved) {
          setActiveBrandState(saved);
        } else if (data.length > 0) {
          setActiveBrandState(data[0]);
        }
      } else if (data.length > 0) {
        setActiveBrandState(data[0]);
      }
    } catch (err) {
      console.error("Failed to load brands:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const setActiveBrand = useCallback((brand: Brand) => {
    setActiveBrandState(brand);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, brand.id);
    }
  }, []);

  const refreshBrands = useCallback(async () => {
    setLoading(true);
    await loadBrands();
  }, [loadBrands]);

  return (
    <BrandContext.Provider value={{ brands, activeBrand, setActiveBrand, loading, refreshBrands }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
