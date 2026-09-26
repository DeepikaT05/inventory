import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type Dashboard, type Shop } from './api';

export type AppLang = 'en' | 'hi';

export interface CartLine { itemId: string; grams: number }

interface Store {
  /** undefined while loading, null when the shop hasn't been set up yet. */
  shop: Shop | null | undefined;
  setShop: (s: Shop) => void;
  dash: Dashboard | null;
  loadError: string | null;
  refresh: () => Promise<void>;
  lang: AppLang;
  setLang: (l: AppLang) => void;
  t: (en: string, hi?: string) => string;
  itemName: (it: { nameEn: string; nameHi?: string }) => string;
  showHi: boolean;
  cart: CartLine[];
  setCart: (c: CartLine[] | ((c: CartLine[]) => CartLine[])) => void;
  toast: string;
  say: (t: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState('');
  const [lang, setLangState] = useState<AppLang>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const s = window.localStorage.getItem('mandi_app_lang');
      if (s === 'en' || s === 'hi') return s;
    }
    return 'hi';
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setLang = useCallback((l: AppLang) => {
    setLangState(l);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('mandi_app_lang', l);
    }
  }, []);

  const t = useCallback((en: string, hi?: string) => {
    if (lang === 'hi' && hi) return hi;
    return en;
  }, [lang]);

  const itemName = useCallback((it: { nameEn: string; nameHi?: string }) => {
    if (lang === 'hi' && it.nameHi) return it.nameHi;
    return it.nameEn;
  }, [lang]);

  const say = useCallback((t: string) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 1900);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await api.shop();
      setShop(s);
      if (s) setDash(await api.dashboard());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<Store>(() => ({
    shop, setShop, dash, loadError, refresh,
    lang, setLang, t, itemName,
    showHi: lang === 'hi',
    cart, setCart, toast, say,
  }), [shop, dash, loadError, refresh, lang, setLang, t, itemName, cart, toast, say]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Run an async action, toasting its error message on failure. */
export function useAction() {
  const { say } = useStore();
  return useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try { return await fn(); } catch (e) { say(e instanceof Error ? e.message : 'Something went wrong'); return undefined; }
  }, [say]);
}
