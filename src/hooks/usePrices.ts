import { useEffect, useCallback } from 'react';
import { priceService } from '../api/priceService';
import { RequestManager } from '../api/RequestManager';
import { useAppDispatch } from './redux';
import {
  fetchPricesStart,
  fetchPricesSuccess,
  fetchPricesError,
  updatePriceData,
} from '../store/portfolioSlice';
import type { Holding, PriceData } from '../models/types';

interface UsePricesReturn {
  refreshPrices: () => void;
}

/**
 * Portföydeki varlıkların fiyatlarını akıllı bir sıra yönetimi
 * ile çeken ve Redux state'ini aşamalı olarak güncelleyen hook.
 * @param holdings Fiyatları çekilecek varlıkların listesi.
 */
export function usePrices(holdings: Holding[]): UsePricesReturn {
  const dispatch = useAppDispatch();

  const fetchPrices = useCallback(async (isRefresh = false) => {
    if (holdings.length === 0) {
      return;
    }

    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))];

    // Fiyat çekme işlemini başlat
    dispatch(fetchPricesStart(uniqueSymbols));

    if (isRefresh) {
      priceService.clearCache();
    }

    // Her bir fiyat geldiğinde Redux'ı güncelle
    const onPriceUpdate = (priceData: PriceData | null) => {
      if (priceData) { // Sadece null değilse Redux'a gönder
        dispatch(updatePriceData(priceData));
      }
    };

    // Fonlar ve diğerleri için ayrı istek yöneticileri
    // TEFAS çok hassas olduğu için tek tek (concurrency: 1)
    const tefasManager = new RequestManager<PriceData | null>(1, onPriceUpdate);
    
    // Yahoo daha toleranslı, 4'lü gruplar halinde
    const yahooManager = new RequestManager<PriceData | null>(4, onPriceUpdate);

    holdings.forEach(holding => {
      // Fonksiyonu bir closure içine alarak `holding.symbol` değerini koru
      const requestFn = () => priceService.fetchSinglePrice(holding.symbol);
      
      if (holding.type === 'FUND') {
        tefasManager.add(requestFn, holding.symbol);
      } else {
        yahooManager.add(requestFn, holding.symbol);
      }
    });

    try {
      // Her iki yöneticiyi de paralel olarak başlat
      await Promise.all([
        tefasManager.start(),
        yahooManager.start()
      ]);
      dispatch(fetchPricesSuccess());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fiyatlar çekilemedi.';
      dispatch(fetchPricesError(message));
    }

  }, [holdings, dispatch]);

  // Sadece holding listesi değiştiğinde fetch'i tetikle
  useEffect(() => {
    fetchPrices(false);
  }, [fetchPrices]);
  
  const refreshPrices = useCallback(() => {
    fetchPrices(true);
  }, [fetchPrices]);

  return { refreshPrices };
} 