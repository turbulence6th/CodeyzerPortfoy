import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { Holding, PriceData } from '../models/types';

// Önbellek öğesinin tipi
export interface PriceCacheItem {
  data: PriceData;
  timestamp: number;
}

interface PortfolioState {
  holdings: Holding[];
  prices: Record<string, PriceData>;
  priceCache: Record<string, PriceCacheItem>; // Kalıcı önbellek
  loading: boolean;
  error: string | null;
  /** Hangi sembollerin fiyatının güncellendiğini takip eder */
  updatingSymbols: string[];
  lastUpdate: string | null;
  /** Son güncellemenin istatistikleri */
  lastUpdateStats: {
    live: number;
    cached: number;
    total: number;
  } | null;
  /** Kullanıcının manuel girdiği toplam borç tutarı */
  totalDebt: number;
}

const initialState: PortfolioState = {
  holdings: [],
  prices: {},
  priceCache: {},
  loading: false,
  error: null,
  updatingSymbols: [],
  lastUpdate: null,
  lastUpdateStats: null,
  totalDebt: 0,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    addHolding: (state, action: PayloadAction<Holding>) => {
      state.holdings.push(action.payload);
    },
    
    updateHolding: (state, action: PayloadAction<{ id: string; updates: Partial<Holding> }>) => {
      const { id, updates } = action.payload;
      const index = state.holdings.findIndex(h => h.id === id);
      if (index !== -1) {
        state.holdings[index] = { 
          ...state.holdings[index], 
          ...updates
        };
      }
    },
    
    removeHolding: (state, action: PayloadAction<string>) => {
      // Önce silinecek holding'i bul (filter'dan ÖNCE!)
      const holdingToRemove = state.holdings.find(h => h.id === action.payload);
      state.holdings = state.holdings.filter(h => h.id !== action.payload);
      // Aynı sembolü kullanan başka holding yoksa fiyat verisini temizle
      if (holdingToRemove) {
        const symbolStillUsed = state.holdings.some(h => h.symbol === holdingToRemove.symbol);
        if (!symbolStillUsed) {
          delete state.prices[holdingToRemove.symbol];
          delete state.priceCache[holdingToRemove.symbol];
        }
      }
    },

    // Fiyatları çekmeye başla
    fetchPricesStart: (state, action: PayloadAction<string[]>) => {
      state.loading = true;
      state.error = null;
      // Mevcut updatingSymbols'a yeni sembolleri ekle (eşzamanlı fetch'ler çakışmasın)
      const existingSet = new Set(state.updatingSymbols);
      action.payload.forEach(s => existingSet.add(s));
      state.updatingSymbols = [...existingSet];
    },

    // Fiyatları çekme işlemi bitti
    fetchPricesSuccess: (state) => {
      state.loading = false;
      state.updatingSymbols = [];
      state.lastUpdate = new Date().toISOString();
    },

    // Fiyat çekme hatası
    fetchPricesError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.updatingSymbols = [];
    },
    
    // Tek bir varlığın fiyatını güncelle
    updatePriceData: (state, action: PayloadAction<PriceData>) => {
      const priceData = action.payload;
      state.prices[priceData.symbol] = priceData;
      // Güncellenen sembolü listeden çıkar
      state.updatingSymbols = state.updatingSymbols.filter(s => s !== priceData.symbol);
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Önbelleğe bir öğe ekle veya güncelle
    setPriceCacheItem: (state, action: PayloadAction<{ symbol: string; item: PriceCacheItem }>) => {
      state.priceCache[action.payload.symbol] = action.payload.item;
    },

    // Fiyat güncelleme istatistiklerini ayarla
    setLastUpdateStats: (state, action:PayloadAction<{ live: number; cached: number; total: number }>) => {
      state.lastUpdateStats = action.payload;
    },

    // Toplam borç tutarını ayarla
    setTotalDebt: (state, action: PayloadAction<number>) => {
      state.totalDebt = action.payload;
    },

    // Fiyat önbelleğini temizle
    clearPriceCache: (state) => {
      state.priceCache = {};
    },
    
    // Tüm state'i geri yükle
    restorePortfolioState: (_state, action: PayloadAction<PortfolioState>) => {
      return action.payload;
    },
  },
});

export const {
  addHolding,
  updateHolding,
  removeHolding,
  fetchPricesStart,
  fetchPricesSuccess,
  fetchPricesError,
  updatePriceData,
  clearError,
  setPriceCacheItem,
  setLastUpdateStats,
  setTotalDebt,
  clearPriceCache,
  restorePortfolioState,
} = portfolioSlice.actions;

// Selectors
const selectPortfolioState = (state: RootState) => state.portfolio;

export const selectPortfolioSummary = createSelector(
  [selectPortfolioState],
  (portfolio) => {
    const { holdings, prices } = portfolio;
    
    const { totalValue, dailyChange } = holdings.reduce(
      (acc, holding) => {
        const priceData = prices[holding.symbol];
        if (priceData) {
          acc.totalValue += priceData.price * holding.amount;
          acc.dailyChange += priceData.change * holding.amount;
        }
        return acc;
      },
      { totalValue: 0, dailyChange: 0 }
    );

    const previousDayTotalValue = totalValue - dailyChange;
    const dailyChangePercent = previousDayTotalValue !== 0
      ? (dailyChange / previousDayTotalValue) * 100
      : 0;

    return {
      totalValue,
      dailyChange,
      dailyChangePercent,
      previousDayTotalValue,
    };
  }
);

export default portfolioSlice.reducer; 