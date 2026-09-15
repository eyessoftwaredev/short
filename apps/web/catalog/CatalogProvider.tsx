"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import copyData from "@/data/copy.json";

export type ToastKind = "success" | "error" | "info" | "warn";

export type CatalogToast = {
  id: string;
  icon: string;
  title: string;
  body: string;
  border: string;
  iconBg: string;
};

type CatalogContextValue = {
  toasts: CatalogToast[];
  pushToast: (kind: ToastKind) => void;
  dismissToast: (id: string) => void;
  formModalOpen: boolean;
  confirmModalOpen: boolean;
  drawerOpen: boolean;
  setFormModalOpen: (open: boolean) => void;
  setConfirmModalOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  closeOverlays: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}

type CatalogProviderProps = {
  children: ReactNode;
};

export function CatalogProvider({ children }: CatalogProviderProps) {
  const [toasts, setToasts] = useState<CatalogToast[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (kind: ToastKind) => {
      const preset = copyData.toastPresets[kind];
      const id = `t-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, ...preset }].slice(-4));
      window.setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  const closeOverlays = useCallback(() => {
    setFormModalOpen(false);
    setConfirmModalOpen(false);
    setDrawerOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismissToast,
      formModalOpen,
      confirmModalOpen,
      drawerOpen,
      setFormModalOpen,
      setConfirmModalOpen,
      setDrawerOpen,
      closeOverlays,
    }),
    [
      toasts,
      pushToast,
      dismissToast,
      formModalOpen,
      confirmModalOpen,
      drawerOpen,
      closeOverlays,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
