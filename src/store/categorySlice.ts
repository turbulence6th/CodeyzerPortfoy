import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { CategoryChart, Category } from '../models/types';

interface CategoryState {
  charts: CategoryChart[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  charts: [],
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    // Grafik yönetimi
    addChart: (state, action: PayloadAction<CategoryChart>) => {
      state.charts.push(action.payload);
    },
    
    updateChart: (state, action: PayloadAction<{ id: string; updates: Partial<CategoryChart> }>) => {
      const { id, updates } = action.payload;
      const index = state.charts.findIndex(c => c.id === id);
      if (index !== -1) {
        state.charts[index] = { 
          ...state.charts[index], 
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
    },
    
    removeChart: (state, action: PayloadAction<string>) => {
      state.charts = state.charts.filter(c => c.id !== action.payload);
    },
    
    // Kategori yönetimi
    addCategoryToChart: (state, action: PayloadAction<{ chartId: string; category: Category }>) => {
      const { chartId, category } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        chart.categories.push(category);
        chart.updatedAt = new Date().toISOString();
      }
    },
    
    updateCategory: (state, action: PayloadAction<{ chartId: string; categoryId: string; updates: Partial<Category> }>) => {
      const { chartId, categoryId, updates } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        const categoryIndex = chart.categories.findIndex(cat => cat.id === categoryId);
        if (categoryIndex !== -1) {
          chart.categories[categoryIndex] = { 
            ...chart.categories[categoryIndex], 
            ...updates,
            updatedAt: new Date().toISOString()
          };
          chart.updatedAt = new Date().toISOString();
        }
      }
    },
    
    removeCategoryFromChart: (state, action: PayloadAction<{ chartId: string; categoryId: string }>) => {
      const { chartId, categoryId } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        chart.categories = chart.categories.filter(cat => cat.id !== categoryId);
        chart.updatedAt = new Date().toISOString();
      }
    },
    
    // Kategoriye varlık ekleme/çıkarma
    addHoldingToCategory: (state, action: PayloadAction<{ chartId: string; categoryId: string; holdingId: string }>) => {
      const { chartId, categoryId, holdingId } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        const category = chart.categories.find(cat => cat.id === categoryId);
        if (category && !category.holdingIds.includes(holdingId)) {
          category.holdingIds.push(holdingId);
          category.updatedAt = new Date().toISOString();
          chart.updatedAt = new Date().toISOString();
        }
      }
    },
    
    removeHoldingFromCategory: (state, action: PayloadAction<{ chartId: string; categoryId: string; holdingId: string }>) => {
      const { chartId, categoryId, holdingId } = action.payload;
      const chart = state.charts.find(c => c.id === chartId);
      if (chart) {
        const category = chart.categories.find(cat => cat.id === categoryId);
        if (category) {
          category.holdingIds = category.holdingIds.filter(id => id !== holdingId);
          category.updatedAt = new Date().toISOString();
          chart.updatedAt = new Date().toISOString();
        }
      }
    },
    
    // Varlık silindiğinde tüm kategorilerden çıkar
    removeHoldingFromAllCategories: (state, action: PayloadAction<string>) => {
      const holdingId = action.payload;
      state.charts.forEach(chart => {
        chart.categories.forEach(category => {
          if (category.holdingIds.includes(holdingId)) {
            category.holdingIds = category.holdingIds.filter(id => id !== holdingId);
            category.updatedAt = new Date().toISOString();
          }
        });
        chart.updatedAt = new Date().toISOString();
      });
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  addChart,
  updateChart,
  removeChart,
  addCategoryToChart,
  updateCategory,
  removeCategoryFromChart,
  addHoldingToCategory,
  removeHoldingFromCategory,
  removeHoldingFromAllCategories,
  setLoading,
  setError,
  clearError,
} = categorySlice.actions;

export default categorySlice.reducer; 