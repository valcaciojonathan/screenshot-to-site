import { useSyncExternalStore } from "react";

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  quantity: number;
};

const KEY = "tanjiro-cart";
const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = EMPTY;
  }
}

function commit(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked */
  }
  listeners.forEach((l) => l());
}

export const cart = {
  add(p: Omit<CartItem, "quantity">, qty = 1) {
    load();
    if (p.stock <= 0) return false;
    const existing = items.find((i) => i.product_id === p.product_id);
    if (existing) {
      const q = Math.min(existing.quantity + qty, p.stock);
      commit(items.map((i) => (i.product_id === p.product_id ? { ...i, ...p, quantity: q } : i)));
    } else {
      commit([...items, { ...p, quantity: Math.min(qty, p.stock) }]);
    }
    return true;
  },
  setQty(id: string, qty: number) {
    load();
    commit(
      items
        .map((i) => (i.product_id === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i))
        .filter((i) => i.quantity > 0),
    );
  },
  remove(id: string) {
    load();
    commit(items.filter((i) => i.product_id !== id));
  },
  clear() {
    commit([]);
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const list = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return items;
    },
    () => EMPTY,
  );
  const count = list.reduce((s, i) => s + i.quantity, 0);
  const subtotal = list.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items: list, count, subtotal };
}
