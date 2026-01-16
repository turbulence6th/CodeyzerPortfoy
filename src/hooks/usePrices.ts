import { useEffect, useCallback, useRef } from 'react';
import { priceService, PriceService } from '../api/priceService'; // PriceService sınıfını da import et
import { RequestManager } from '../api/RequestManager';
import { useAppDispatch, useAppSelector } from './redux';
import {
  fetchPricesStart,
  fetchPricesSuccess,
  fetchPricesError,
  updatePriceData,
  setPriceCacheItem,
  setLastUpdateStats,
} from '../store/portfolioSlice';
import type { Holding, PriceData } from '../models/types';

interface UsePricesReturn {
  refreshPrices: () => void;
}

export function usePrices(holdings: Holding[]): UsePricesReturn {
  const dispatch = useAppDispatch();
  const priceCache = useAppSelector((state) => state.portfolio.priceCache);
  const priceCacheRef = useRef(priceCache);
  priceCacheRef.current = priceCache;

  const fetchPrices = useCallback(async () => {
    if (holdings.length === 0) return;

    const uniqueSymbols = [...new Set(holdings.map(h => h.symbol))];
    dispatch(fetchPricesStart(uniqueSymbols));

    const onPriceUpdate = (priceData: PriceData | null) => {
      if (priceData) {
        dispatch(updatePriceData(priceData));
        if (priceData.price !== 0 && !priceData.error) {
          dispatch(setPriceCacheItem({
            symbol: priceData.symbol,
            item: { data: priceData, timestamp: Date.now() }
          }));
        }
      }
    };

    // TEFAS için istekler arasında 150ms gecikme (sunucu rate limit'i aşmamak için)
    const tefasManager = new RequestManager<PriceData | null>(1, onPriceUpdate, 150);
    const yahooManager = new RequestManager<PriceData | null>(4, onPriceUpdate);

    let cachedCount = 0;
    const liveSymbols: string[] = [];

    // Tüm semboller artık tek bir listede, özel bir ayrım yok.
    for (const symbol of uniqueSymbols) {
      const type = PriceService.getAssetTypeFromSymbol(symbol);
      const cachedItem = priceCacheRef.current[symbol];
      
      const useCache = cachedItem 
        ? priceService.isCacheValid(symbol, cachedItem.timestamp, cachedItem.data)
        : false;
 
      if (useCache) {
        dispatch(updatePriceData({ ...cachedItem.data, source: 'cache' }));
        cachedCount++;
      } else {
        liveSymbols.push(symbol);
        const requestFn = () => priceService.fetchSinglePrice(symbol);
        if (type === 'FUND') {
          tefasManager.add(requestFn, symbol);
        } else {
          yahooManager.add(requestFn, symbol);
        }
      }
    }
 
    try {
      // Fiyat güncelleme istatistiklerini ayarla
      dispatch(setLastUpdateStats({
        live: liveSymbols.length,
        cached: cachedCount,
        total: uniqueSymbols.length,
      }));
      
      // Tüm isteklerin (GAUTRY dahil) tamamlanmasını bekle
      await Promise.all([tefasManager.start(), yahooManager.start()]);
 
      dispatch(fetchPricesSuccess());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fiyatlar çekilemedi.';
      dispatch(fetchPricesError(message));
    }
 
  }, [holdings, dispatch]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);
  
  const refreshPrices = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { refreshPrices };
} 