import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';
import portfolioReducer, { removeHolding } from './portfolioSlice';
import categoryReducer, { removeHoldingFromAllCategories } from './categorySlice';
import { createListenerMiddleware } from '@reduxjs/toolkit';

// Listener middleware oluştur
const listenerMiddleware = createListenerMiddleware();

// Varlık silindiğinde kategorilerden de sil
listenerMiddleware.startListening({
  actionCreator: removeHolding,
  effect: (action, listenerApi) => {
    listenerApi.dispatch(removeHoldingFromAllCategories(action.payload));
  },
});

// Her reducer için ayrı persist config
const portfolioPersistConfig = {
  key: 'portfolio',
  storage,
  whitelist: ['holdings', 'priceCache'] // holdings ve priceCache'i persist et
};

const categoryPersistConfig = {
  key: 'category',
  storage,
  whitelist: ['charts'] // Sadece charts'ları persist et
};

const rootReducer = combineReducers({
  portfolio: persistReducer(portfolioPersistConfig, portfolioReducer),
  category: persistReducer(categoryPersistConfig, categoryReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).prepend(listenerMiddleware.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 