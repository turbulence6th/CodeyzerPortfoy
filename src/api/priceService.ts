import axios from 'axios';
import type { PriceData } from '../models/types';
import { tefasService } from './tefasService';

// Yahoo Finance Chart API response types
interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        shortName?: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
          open: number[];
          high: number[];
          low: number[];
          volume: number[];
        }>;
      };
    }>;
    error: any;
  };
}

// Development için local proxy, production için doğrudan API
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
  ? '/api/yahoo/v8/finance/chart' // Vite proxy üzerinden
  : 'https://query1.finance.yahoo.com/v8/finance/chart'; // Doğrudan (production için)

// CORS proxy servisi (geliştirme aşamasında kullanılabilir)
// const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

export class PriceService {
  private static instance: PriceService;
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 dakika

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async fetchPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    if (symbols.length === 0) return {};

    const prices: Record<string, PriceData> = {};
    const symbolsToFetch: string[] = [];

    // Önce cache'den kontrol et
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol);
      if (cached && this.isCacheValid(cached.timestamp)) {
        prices[symbol] = cached.data;
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    // Gerekli sembolleri API'den çek (tek tek)
    if (symbolsToFetch.length > 0) {
      try {
        const fetchPromises = symbolsToFetch.map(symbol => this.fetchSinglePrice(symbol));
        const results = await Promise.allSettled(fetchPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const symbol = symbolsToFetch[index];
            prices[symbol] = result.value;
          } else {
            console.warn(`⚠️ Failed to fetch price for ${symbolsToFetch[index]}`);
          }
        });
      } catch (error) {
        console.error('🚨 Fiyat çekme hatası:', error);
        throw new Error('Fiyat verileri alınamadı. Lütfen tekrar deneyin.');
      }
    }

    return prices;
  }

  private async fetchSinglePrice(symbol: string): Promise<PriceData | null> {
    // Önce TEFAS fon kodu olma ihtimalini kontrol et
    if (/^[A-Z]{3}$/.test(symbol)) {
      const fundPrice = await tefasService.fetchFundPrice(symbol);
      if (fundPrice) {
        // Fon fiyatı bulundu, cache'e ekle ve dön
        this.cache.set(symbol, { data: fundPrice, timestamp: Date.now() });
        return fundPrice;
      }
      // Eğer fon fiyatı bulunamazsa Yahoo Finance denemeye devam et
    }

    // Altın için özel işlem: GC=F (ons altın USD) + USDTRY
    if (symbol === 'GAUTRY') {
      return this.fetchGoldPrice();
    }

    const transformedSymbol = PriceService.transformSymbol(symbol);

    // Yahoo Finance üzerinden al
    const yahooData = await this.fetchYahooPrice(transformedSymbol);
    if (yahooData) {
      // fetchYahooPrice dönüşünde sembol değişmiş olabilir; orijinal sembolü geri yaz
      const priceData: PriceData = { ...yahooData, symbol };

      // Cache'e kaydet
      this.cache.set(symbol, { data: priceData, timestamp: Date.now() });
      return priceData;
    }

    console.warn('⚠️ Price not found for', symbol);
    return null;
  }

  // Altın için özel çevrim: GC=F (ons altın USD) -> Gram altın TRY
  private async fetchGoldPrice(): Promise<PriceData | null> {
    try {
      // 1 ons = 31.1035 gram
      const GRAMS_PER_OUNCE = 31.1035;
      
      // Paralel olarak ons altın USD ve USD/TRY kurunu çek
      const [goldResponse, usdtryResponse] = await Promise.all([
        this.fetchYahooPrice('GC=F'), // Ons altın USD
        this.fetchYahooPrice('USDTRY=X') // USD/TRY kuru
      ]);

      if (!goldResponse || !usdtryResponse) {
        console.error('❌ Altın veya USD/TRY fiyatı alınamadı');
        return null;
      }

      // Güncel fiyat hesaplama
      const ounceGoldUSD = goldResponse.price;
      const usdTryRate = usdtryResponse.price;
      const gramGoldTRY = (ounceGoldUSD / GRAMS_PER_OUNCE) * usdTryRate;

      // Önceki kapanış için optimize edilmiş hesaplama
      // goldResponse ve usdtryResponse'lar artık optimize edilmiş değişim verisi içeriyor
      const prevOunceGoldUSD = goldResponse.price - goldResponse.change;
      const prevUsdTryRate = usdtryResponse.price - usdtryResponse.change;
      const prevGramGoldTRY = (prevOunceGoldUSD / GRAMS_PER_OUNCE) * prevUsdTryRate;

      // TL cinsinden değişimi hesapla
      const change = gramGoldTRY - prevGramGoldTRY;
      let changePercent = prevGramGoldTRY !== 0 ? (change / prevGramGoldTRY) * 100 : 0;

      // Aşırı yüksek değişim oranlarını sınırla (altın için de)
      const MAX_GOLD_DAILY_CHANGE = 15; // Altın için %15 maksimum günlük değişim (daha muhafazakar)
      if (Math.abs(changePercent) > MAX_GOLD_DAILY_CHANGE) {
        console.warn(`⚠️ GAUTRY: Aşırı yüksek altın değişimi tespit edildi: ${changePercent.toFixed(2)}%. Sınırlanıyor.`);
        changePercent = Math.sign(changePercent) * MAX_GOLD_DAILY_CHANGE;
      }

      // Debug: Gelişmiş altın hesaplama detayları
      console.log('🥇 Altın Gelişmiş Hesaplama Detayları:', {
        'Güncel Ons USD': ounceGoldUSD.toFixed(4),
        'Güncel USD/TRY': usdTryRate.toFixed(4),
        'Güncel Gram TRY': gramGoldTRY.toFixed(4),
        'Önceki Ons USD': prevOunceGoldUSD.toFixed(4),
        'Önceki USD/TRY': prevUsdTryRate.toFixed(4),
        'Önceki Gram TRY': prevGramGoldTRY.toFixed(4),
        'TL Değişim': change.toFixed(4),
        'Original TL Değişim %': ((gramGoldTRY - prevGramGoldTRY) / prevGramGoldTRY * 100).toFixed(2) + '%',
        'Final TL Değişim %': changePercent.toFixed(2) + '%',
        'Altın Change %': goldResponse.changePercent.toFixed(2) + '%',
        'USD/TRY Change %': usdtryResponse.changePercent.toFixed(2) + '%'
      });

      const priceData: PriceData = {
        symbol: 'GAUTRY',
        price: Number(gramGoldTRY.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePercent: Number(changePercent.toFixed(2)),
        lastUpdate: new Date().toISOString(),
        name: 'Gram Altın',
      };

      // Cache'e kaydet
      this.cache.set('GAUTRY', { data: priceData, timestamp: Date.now() });
      return priceData;

    } catch (error) {
      console.error('❌ Altın fiyatı hesaplama hatası:', error);
      return null;
    }
  }

  // Yahoo Finance'den tek bir sembol için fiyat çek (dahili kullanım)
  private async fetchYahooPrice(symbol: string): Promise<PriceData | null> {
    // Son 5 günlük veriyi çek - daha fazla data noktası için
    const url = `${API_BASE_URL}/${symbol}?range=5d&interval=1d&includePrePost=false`;

    try {
      const response = await axios.get<YahooChartResponse>(url, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' },
      });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const meta = result.meta;
        
        // Historical data'dan daha stabil karşılaştırma yap (altın için)
        const indicators = result.indicators?.quote?.[0];
        const closePrices = indicators?.close?.filter((price: number | null) => price != null) || [];
        
        const currentPrice = meta.regularMarketPrice;
        let previousClose = currentPrice; // Varsayılan olarak değişim yok
        
        // Son 2 kapanış fiyatını karşılaştır (en stabil yöntem)
        if (closePrices.length >= 2) {
          // Son kapanış (bugün) ve önceki kapanış (dün)
          const lastClose = closePrices[closePrices.length - 1];
          const prevClose = closePrices[closePrices.length - 2];
          
          // Eğer son kapanış güncel fiyata yakınsa (aynı gün), önceki günü kullan
          if (Math.abs(lastClose - currentPrice) < Math.abs(prevClose - currentPrice)) {
            previousClose = prevClose;
          } else {
            previousClose = lastClose;
          }
        } else {
          // Fallback: meta'dan önceki kapanış
          previousClose = meta.previousClose ?? (meta as any).chartPreviousClose ?? currentPrice;
        }
        
        const change = currentPrice - previousClose;
        let changePercent = previousClose !== 0 && previousClose !== currentPrice ? (change / previousClose) * 100 : 0;
        
        // Aşırı yüksek değişim oranlarını sınırla (veri hatası olabilir)
        const MAX_DAILY_CHANGE = 25; // %25 maksimum günlük değişim
        if (Math.abs(changePercent) > MAX_DAILY_CHANGE) {
          console.warn(`⚠️ ${symbol}: Aşırı yüksek değişim tespit edildi: ${changePercent.toFixed(2)}%. Sınırlanıyor.`);
          changePercent = Math.sign(changePercent) * MAX_DAILY_CHANGE;
        }
        
        // Debug: Gelişmiş fiyat analizi (altın için)
        console.log(`🥇 ${symbol} Enhanced Debug:`, {
          currentPrice,
          calculatedPreviousClose: previousClose,
          metaPreviousClose: meta.previousClose,
          chartPreviousClose: (meta as any).chartPreviousClose,
          closePricesLength: closePrices.length,
          lastClosePrices: closePrices.slice(-3), // Son 3 kapanış
          change: change.toFixed(4),
          originalChangePercent: ((currentPrice - previousClose) / previousClose * 100).toFixed(2) + '%',
          finalChangePercent: changePercent.toFixed(2) + '%'
        });

        return {
          symbol,
          price: Number(currentPrice.toFixed(4)),
          change: Number(change.toFixed(4)),
          changePercent: Number(changePercent.toFixed(2)),
          lastUpdate: new Date().toISOString(),
          name: meta.shortName || meta.symbol,
        };
      }
    } catch (error) {
      console.error(`❌ Yahoo Finance error for ${symbol}:`, error);
    }

    return null;
  }

  // Türk varlıkları için sembol dönüşümü
  static transformSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'USDTRY': 'USDTRY=X',
      'EURTRY': 'EURTRY=X',
      // GAUTRY artık GC=F + USDTRY üzerinden hesaplanıyor
      'XAGTRY': 'XAGTRY=X', // Gümüş / TL
    };

    // Öncelikle özel eşleştirmelere bak
    if (symbol in symbolMap) {
      return symbolMap[symbol];
    }

    // Ardından BIST hisse senetleri için .IS ekle
    if (/^[A-Z]{3,6}$/.test(symbol) && !symbol.includes('=') && !symbol.includes('.')) {
      return `${symbol}.IS`;
    }

    // Değişiklik yoksa orijinal sembolü dön
    return symbol;
  }

  // BIST hisse sembolleri
  static getBISTSymbol(code: string): string {
    return `${code}.IS`;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Price cache cleared');
  }
}

export const priceService = PriceService.getInstance(); 