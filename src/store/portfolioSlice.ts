import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Holding, PriceData } from '../models/types';

interface PortfolioState {
  holdings: Holding[];
  prices: Record<string, PriceData>;
  loading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  holdings: [],
  prices: {},
  loading: false,
  error: null,
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
      // Not: Kategorilerden silme işlemi middleware veya listener ile yapılacak
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    updatePrices: (state, action: PayloadAction<Record<string, PriceData>>) => {
      state.prices = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  addHolding,
  updateHolding,
  removeHolding,
  setLoading,
  setError,
  updatePrices,
  clearError,
} = portfolioSlice.actions;

export default portfolioSlice.reducer; 