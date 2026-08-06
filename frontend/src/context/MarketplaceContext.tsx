'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { MarketplaceItem } from '@/src/data/marketplace';

// ── Types ─────────────────────────────────────────────────────────────────────
export type MarketplaceView =
  | 'home' | 'books' | 'videos' | 'courses' | 'resources'
  | 'bundles' | 'wishlist' | 'library' | 'purchases'
  | 'search' | 'checkout' | 'purchase-success';

export interface CartItem {
  id: string;
  title: string;
  type: MarketplaceItem['type'];
  price: number;
  thumbnail: string;
}

interface State {
  view: MarketplaceView;
  selectedId: string | null;
  library: Set<string>;
  wishlist: Set<string>;
  cart: CartItem[];
  orders: { id: string; date: string; items: CartItem[]; total: number; method: string }[];
  searchQuery: string;
  lastOrderId: string | null;
}

type Action =
  | { type: 'SET_VIEW'; view: MarketplaceView; id?: string }
  | { type: 'ADD_TO_CART'; item: CartItem }
  | { type: 'REMOVE_FROM_CART'; id: string }
  | { type: 'CLEAR_CART' }
  | { type: 'CHECKOUT'; method: string }
  | { type: 'TOGGLE_WISHLIST'; id: string }
  | { type: 'SET_SEARCH'; query: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view, selectedId: action.id ?? null };
    case 'ADD_TO_CART': {
      if (state.cart.find(c => c.id === action.item.id)) return state;
      if (state.library.has(action.item.id)) return state;
      return { ...state, cart: [...state.cart, action.item] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(c => c.id !== action.id) };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'CHECKOUT': {
      const orderId = `HC-MKT-${Date.now()}`;
      const newLib = new Set(state.library);
      state.cart.forEach(c => newLib.add(c.id));
      const total = state.cart.reduce((s, c) => s + c.price, 0);
      const order = { id: orderId, date: new Date().toLocaleDateString(), items: state.cart, total, method: action.method };
      return { ...state, library: newLib, cart: [], orders: [order, ...state.orders], lastOrderId: orderId, view: 'purchase-success' };
    }
    case 'TOGGLE_WISHLIST': {
      const w = new Set(state.wishlist);
      if (w.has(action.id)) w.delete(action.id); else w.add(action.id);
      return { ...state, wishlist: w };
    }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query, view: action.query ? 'search' : state.view };
    default:
      return state;
  }
}

const INITIAL: State = {
  view: 'home', selectedId: null,
  library: new Set(['crs-001']), // demo: one pre-purchased item
  wishlist: new Set(['bk-002']),
  cart: [],
  orders: [{ id: 'HC-MKT-DEMO', date: 'Jul 1, 2026', items: [{ id: 'crs-001', title: 'Professional Photography: Complete Diploma Prep', type: 'course', price: 799, thumbnail: '/exhibition.png' }], total: 799, method: 'Chapa' }],
  searchQuery: '',
  lastOrderId: null,
};

interface ContextValue {
  state: State;
  navigate: (view: MarketplaceView, id?: string) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  checkout: (method: string) => void;
  toggleWishlist: (id: string) => void;
  setSearch: (q: string) => void;
  isOwned: (id: string) => boolean;
  isInCart: (id: string) => boolean;
  isWishlisted: (id: string) => boolean;
}

const Ctx = createContext<ContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const navigate = useCallback((view: MarketplaceView, id?: string) => dispatch({ type: 'SET_VIEW', view, id }), []);
  const addToCart = useCallback((item: CartItem) => dispatch({ type: 'ADD_TO_CART', item }), []);
  const removeFromCart = useCallback((id: string) => dispatch({ type: 'REMOVE_FROM_CART', id }), []);
  const checkout = useCallback((method: string) => dispatch({ type: 'CHECKOUT', method }), []);
  const toggleWishlist = useCallback((id: string) => dispatch({ type: 'TOGGLE_WISHLIST', id }), []);
  const setSearch = useCallback((query: string) => dispatch({ type: 'SET_SEARCH', query }), []);
  const isOwned = useCallback((id: string) => state.library.has(id), [state.library]);
  const isInCart = useCallback((id: string) => state.cart.some(c => c.id === id), [state.cart]);
  const isWishlisted = useCallback((id: string) => state.wishlist.has(id), [state.wishlist]);
  return (
    <Ctx.Provider value={{ state, navigate, addToCart, removeFromCart, checkout, toggleWishlist, setSearch, isOwned, isInCart, isWishlisted }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return ctx;
}
