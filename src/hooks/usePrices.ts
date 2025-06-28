import { useState, useEffect, useCallback } from 'react';
import { priceService } from '../api/priceService';
import { mockPriceService } from '../api/mockPriceService';
import { tefasService } from '../api/tefasService';
import { config, debugLog } from '../utils/config';
import type { PriceData, Holding } from '../models/types';

interface UsePricesResult {
  prices: Record<string, PriceData>;
  loading: boolean;
  error: string | null;
  refreshPrices: () => Promise<void>;
  lastUpdate: Date | null;
}

export function usePrices(holdings: Holding[], autoRefresh = config.api.autoRefreshPrices): UsePricesResult {
  // Memoize a key representing holdings (symbol+type) to control effects
  const memoizedKey = JSON.stringify(
    holdings
      .map(h => `${h.symbol}:${h.type}`)
      .sort()
  );

  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Service seçimi - artık gerçek API kullanıyoruz
  const selectedService = config.api.useMockService ? mockPriceService : priceService;

  const fetchPrices = useCallback(async () => {
    if (holdings.length === 0) {
      debugLog('No holdings to fetch');
      return;
    }

    debugLog('🔄 Fetching prices for holdings:', holdings.map(h => h.symbol));
    setLoading(true);
    setError(null);

    try {
      // Ayrıştır: fon ve diğerleri
      const fundHoldings = holdings.filter(h => h.type === 'FUND');
      const otherHoldings = holdings.filter(h => h.type !== 'FUND');

      // FON: TEFAS üzerinden tek tek (rate limiting ile)
      let fundPrices: Record<string, PriceData> = {};
      if (fundHoldings.length > 0) {
        const fundSymbols = fundHoldings.map(h => h.symbol);
        debugLog(`📊 TEFAS için ${fundSymbols.length} fon çekilecek:`, fundSymbols);
        
        // Rate limiting ile tek tek çek
        fundPrices = await tefasService.fetchMultipleFundPrices(fundSymbols);
        
        debugLog(`✅ TEFAS sonucu: ${Object.keys(fundPrices).length}/${fundSymbols.length} başarılı`);
      }

      // DİĞERLER: Yahoo vb.
      const otherSymbols = otherHoldings.map(h => h.symbol);
      const otherPrices = await selectedService.fetchPrices(otherSymbols);

      const newPrices = { ...otherPrices, ...fundPrices };
      setPrices(newPrices);
      setLastUpdate(new Date());
      debugLog('✅ Prices updated successfully:', Object.keys(newPrices));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      debugLog('❌ Error fetching prices:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedService, holdings]);

  const refreshPrices = useCallback(async () => {
    await fetchPrices();
  }, [fetchPrices]);

  // Initial fetch + dependency on memoized key
  useEffect(() => {
    if (holdings.length > 0) {
      fetchPrices();
    }
  }, [memoizedKey, fetchPrices]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) {
      debugLog('Auto-refresh disabled');
      return;
    }

    debugLog('🔄 Setting up auto-refresh every', config.api.refreshInterval / 1000, 'seconds');
    
    const interval = setInterval(() => {
      if (holdings.length > 0) {
        debugLog('🔄 Auto-refreshing prices...');
        fetchPrices();
      }
    }, config.api.refreshInterval);

    return () => {
      debugLog('🛑 Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, memoizedKey, fetchPrices]);

  return {
    prices,
    loading,
    error,
    refreshPrices,
    lastUpdate,
  };
} 