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

  const fetchPrices = useCallback(async (isRefresh = false) => {
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

    const tefasManager = new RequestManager<PriceData | null>(1, onPriceUpdate);
    const yahooManager = new RequestManager<PriceData | null>(4, onPriceUpdate);

    // GAUTRY'yi ve bağımlılığı olan USDTRY'yi ayır
    const gautrySymbols = uniqueSymbols.filter(s => s === 'GAU' || s === 'GAUTRY');
    let otherSymbols = uniqueSymbols.filter(s => s !== 'GAU' && s !== 'GAUTRY');

    // GAUTRY varsa, bağımlılığı olan USDTRY'nin de ilk pass'ta istendiğinden emin ol
    if (gautrySymbols.length > 0 && !otherSymbols.includes('USDTRY')) {
      otherSymbols.push('USDTRY');
    }

    // --- 1. Aşama: GAUTRY dışındaki tüm varlıkları çek ---
    for (const symbol of otherSymbols) {
      const type = PriceService.getAssetTypeFromSymbol(symbol);
      const cachedItem = priceCacheRef.current[symbol];
      
      let useCache = false;
      if (cachedItem) {
        if (!isRefresh && (type === 'CURRENCY' || type === 'COMMODITY')) {
          useCache = false;
        } else {
          useCache = priceService.isCacheValid(symbol, cachedItem.timestamp, isRefresh);
        }
      }
 
      if (useCache) {
        dispatch(updatePriceData({ ...cachedItem.data, source: 'cache' }));
      } else {
        const requestFn = () => priceService.fetchSinglePrice(symbol, isRefresh);
        if (type === 'FUND') {
          tefasManager.add(requestFn, symbol);
        } else {
          yahooManager.add(requestFn, symbol);
        }
      }
    }
 
    try {
      // Önce bağımlılıkların (USDTRY dahil) tamamlanmasını bekle
      await Promise.all([tefasManager.start(), yahooManager.start()]);
 
      // --- 2. Aşama: GAUTRY'yi güncel USDTRY ile hesapla ---
      if (gautrySymbols.length > 0) {
        const usdTryCache = priceCacheRef.current['USDTRY']; // Cache şimdi güncel
        if (!usdTryCache) {
          console.error("GAUTRY hesaplaması için USDTRY bulunamadı!");
          throw new Error("USDTRY verisi alınamadı.");
        }
 
        for (const symbol of gautrySymbols) {
          const priceData = await priceService.fetchSinglePrice(symbol, isRefresh, { 
            usdTryPrice: usdTryCache.data 
          });
          onPriceUpdate(priceData); // Sonucu işle
        }
      }
 
      dispatch(fetchPricesSuccess());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fiyatlar çekilemedi.';
      dispatch(fetchPricesError(message));
    }
 
  }, [holdings, dispatch]);

  useEffect(() => {
    fetchPrices(false);
  }, [fetchPrices]);
  
  const refreshPrices = useCallback(() => {
    fetchPrices(true);
  }, [fetchPrices]);

  return { refreshPrices };
} 