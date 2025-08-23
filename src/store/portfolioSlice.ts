import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
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
      state.holdings = state.holdings.filter(h => h.id !== action.payload);
      // Fiyat verisini de temizle
      const holdingToRemove = state.holdings.find(h => h.id === action.payload);
      if (holdingToRemove) {
        delete state.prices[holdingToRemove.symbol];
      }
    },

    // Fiyatları çekmeye başla
    fetchPricesStart: (state, action: PayloadAction<string[]>) => {
      state.loading = true;
      state.error = null;
      state.updatingSymbols = action.payload;
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

    // Fiyat önbelleğini temizle
    clearPriceCache: (state) => {
      state.priceCache = {};
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
  clearPriceCache,
} = portfolioSlice.actions;

export default portfolioSlice.reducer; 