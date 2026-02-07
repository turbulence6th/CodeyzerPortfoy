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

  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  // Eşzamanlı fetch cycle'larını yönetmek için generation counter
  const fetchGenerationRef = useRef(0);

  // Belirtilen semboller için fiyat çek
  const fetchPrices = useCallback(async (symbolsToFetch: string[]) => {
    if (symbolsToFetch.length === 0) return;

    const currentGeneration = ++fetchGenerationRef.current;

    dispatch(fetchPricesStart(symbolsToFetch));

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

    // TEFAS için istekler arasında 150ms gecikme (retry mekanizması mevcut)
    const tefasManager = new RequestManager<PriceData | null>(1, onPriceUpdate, 150);
    const yahooManager = new RequestManager<PriceData | null>(4, onPriceUpdate);

    let cachedCount = 0;
    const liveSymbols: string[] = [];

    // Tüm semboller artık tek bir listede, özel bir ayrım yok.
    for (const symbol of symbolsToFetch) {
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
        total: symbolsToFetch.length,
      }));

      // Tüm isteklerin (GAUTRY dahil) tamamlanmasını bekle
      await Promise.all([tefasManager.start(), yahooManager.start()]);

      // Sadece en son generation tamamlandığında global state'i güncelle
      // Eski cycle'ların fetchPricesSuccess çağırıp updatingSymbols'ı temizlemesini engeller
      if (currentGeneration === fetchGenerationRef.current) {
        dispatch(fetchPricesSuccess());
      }
    } catch (err) {
      if (currentGeneration === fetchGenerationRef.current) {
        const message = err instanceof Error ? err.message : 'Fiyatlar çekilemedi.';
        dispatch(fetchPricesError(message));
      }
    }

  }, [dispatch]);

  // Önceki sembolleri takip et — yeni eklenen sembolleri tespit etmek için
  const prevSymbolsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentSymbols = [...new Set(holdings.map(h => h.symbol))];
    const currentSet = new Set(currentSymbols);
    const newSymbols = currentSymbols.filter(s => !prevSymbolsRef.current.has(s));

    prevSymbolsRef.current = currentSet;

    if (newSymbols.length > 0) {
      // İlk yüklemede tüm semboller "yeni" sayılır → hepsi çekilir
      // Sonraki eklemelerde sadece yeni sembol(ler) çekilir
      fetchPrices(newSymbols);
    }
  }, [holdings, fetchPrices]);

  const refreshPrices = useCallback(() => {
    const uniqueSymbols = [...new Set(holdingsRef.current.map(h => h.symbol))];
    fetchPrices(uniqueSymbols);
  }, [fetchPrices]);

  return { refreshPrices };
}
