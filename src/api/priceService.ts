import axios from 'axios';
import type { PriceData, HistoricalPrice } from '../models/types';
import { tefasService } from './tefasService';

// Swissquote API'sinden gelen veri yapısı için tipler
interface SwissquoteProfilePrice {
  spreadProfile: string;
  bid: number;
  ask: number;
}

interface SwissquotePlatformData {
  topo: {
    platform: string;
  };
  spreadProfilePrices: SwissquoteProfilePrice[];
}


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
          close: (number | null)[];
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          volume: (number | null)[];
        }>;
        adjclose?: Array<{
          adjclose: (number | null)[];
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

const SWISSQUOTE_API_BASE_URL = isDevelopment
  ? '/api/swissquote' // Geliştirme için Vite proxy
  : 'https://forex-data-feed.swissquote.com'; // Üretim (Android dahil) için doğrudan API

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

  async fetchHistoricalPrices(
    symbol: string, 
    range: '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y'| '5y' = '1mo'
  ): Promise<HistoricalPrice[]> {
    // Eğer fon ise, her zaman TEFAS servisini kullan
    if (/^[A-Z]{3}$/.test(symbol)) {
      if (range === '1d') {
        // Günlük veri için eski hızlı yöntemi kullanabiliriz
        const priceData = await this.fetchSinglePrice(symbol);
        return priceData?.historicalData || [];
      }
      // Diğer aralıklar için yeni TEFAS fonksiyonunu çağır
      return tefasService.fetchHistoricalFundPrices(symbol, range as '1w' | '1mo' | '3mo');
    }

    const transformedSymbol = PriceService.transformSymbol(symbol);
    const interval = this.getIntervalForRange(range);
    const url = `${API_BASE_URL}/${transformedSymbol}?range=${range}&interval=${interval}`;

    try {
      const response = await axios.get<YahooChartResponse>(url, {
        timeout: 15000,
        headers: { 'Accept': 'application/json' },
      });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const prices = result.indicators?.quote?.[0]?.close || [];

        const historicalData: HistoricalPrice[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const price = prices[i];
          const timestamp = timestamps[i];

          if (price !== null && timestamp !== null) {
            historicalData.push({
              date: new Date(timestamp * 1000).toISOString().split('T')[0],
              price: price,
            });
          }
        }
        return historicalData;
      }
      return [];
    } catch (error) {
      console.error(`❌ Yahoo Finance historical data error for ${symbol}:`, error);
      throw new Error('Geçmiş fiyat verileri alınamadı.');
    }
  }

  private getIntervalForRange(range: string): string {
    switch (range) {
      case '1d': return '5m';
      case '1w':
      case '5d': return '15m'; // Bu hisseler için hala geçerli olabilir
      case '1mo': return '1d';
      case '3mo':
      case '6mo':
      case '1y':
      case '3y':
      case '5y':
        return '1d';
      default:
        return '1d';
    }
  }

  public async fetchSinglePrice(symbol: string): Promise<PriceData> {
    if (symbol === 'TRY') {
      return {
        symbol: 'TRY',
        price: 1,
        change: 0,
        changePercent: 0,
        previousClose: 1,
        historicalData: [],
        lastUpdate: new Date().toISOString(),
      };
    }

    // Gram Altın (GAU) için özel yönlendirme
    if (symbol === 'GAU' || symbol === 'GAUTRY') {
      return this.fetchGoldPrice(symbol);
    }

    if (symbol === 'XAUUSD' || symbol === 'XAUTRY') {
      return this.fetchSwissquotePrice(symbol);
    }

    // TEFAS fon kodları genellikle 3 harflidir.
    if (symbol.length === 3 && !['GAU', 'XAG'].includes(symbol)) {
      try {
        const fundPrice = await tefasService.fetchFundPrice(symbol);
        if (fundPrice) {
          // Fon fiyatı bulundu, cache'e ekle ve dön
          this.cache.set(symbol, { data: fundPrice, timestamp: Date.now() });
          return fundPrice;
        }
        // Eğer fon fiyatı bulunamazsa Yahoo Finance denemeye devam et
      } catch (error) {
        console.warn(`⚠️ Failed to fetch price for ${symbol} from TEFAS, trying Yahoo Finance.`);
      }
    }

    // Altın için özel işlem: GC=F (ons altın USD) + USDTRY
    if (symbol === 'GAUTRY') {
      return this.fetchGoldPrice(symbol);
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
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      historicalData: [],
      lastUpdate: new Date().toISOString(),
      error: 'Fiyat bulunamadı', // Hata mesajı eklendi
    };
  }

  // Altın için özel çevrim: GC=F (ons altın USD) -> Gram altın TRY
  private async fetchGoldPrice(symbol: string): Promise<PriceData> {
    try {
      // 1 ons = 31.1035 gram
      const OUNCE_TO_GRAM = 31.1035;

      // Paralel olarak gerekli tüm verileri çek
      const [
        ounceUsdSwissquoteResponse,
        ounceUsdYahooResponse,
        usdTryResponse,
      ] = await Promise.all([
        this.fetchSwissquotePrice('XAUUSD'),
        this.fetchYahooPrice('GC=F'), // Dünkü ons fiyatı için Yahoo'yu kullan
        this.fetchSinglePrice('USDTRY'),
      ]);

      // Gelen verilerin geçerliliğini kontrol et
      if (!ounceUsdSwissquoteResponse || ounceUsdSwissquoteResponse.price === 0) {
        throw new Error('Could not fetch current XAUUSD price from Swissquote');
      }
      if (!usdTryResponse || usdTryResponse.price === 0) {
        throw new Error('Could not fetch USDTRY exchange rate');
      }
       if (!ounceUsdYahooResponse) {
        throw new Error('Could not fetch historical XAUUSD price from Yahoo');
      }

      // ANLIK FİYAT HESAPLAMASI
      const currentOuncePriceUSD = ounceUsdSwissquoteResponse.price;
      const currentUsdTryRate = usdTryResponse.price;
      const gramPriceTRY = (currentOuncePriceUSD * currentUsdTryRate) / OUNCE_TO_GRAM;

      // DÜNKÜ FİYAT HESAPLAMASI
      const previousOuncePriceUSD = ounceUsdYahooResponse.previousClose ?? ounceUsdYahooResponse.price;
      const previousUsdTryRate = usdTryResponse.previousClose ?? usdTryResponse.price;
      const previousGramPriceTRY = (previousOuncePriceUSD * previousUsdTryRate) / OUNCE_TO_GRAM;
      
      // DEĞİŞİM HESAPLAMASI
      const change = gramPriceTRY - previousGramPriceTRY;
      const changePercent = previousGramPriceTRY !== 0 ? (change / previousGramPriceTRY) * 100 : 0;

      const result: PriceData = {
        symbol,
        price: gramPriceTRY,
        change: change,
        changePercent: changePercent,
        previousClose: previousGramPriceTRY,
        historicalData: [],
        name: 'Gram Altın',
        currency: 'TRY',
        lastUpdate: new Date().toISOString(),
      };
      return result;
    } catch (error) {
      console.error(`Gram altın hesaplanırken HATA oluştu for ${symbol}:`, error);
      // Hata durumunda boş veri dön
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        historicalData: [],
        name: 'Gram Altın',
        currency: 'TRY',
        lastUpdate: new Date().toISOString(),
        error: 'Altın fiyatı hesaplanamadı', // Hata mesajı eklendi
      };
    }
  }

  private async fetchSwissquotePrice(symbol: string): Promise<PriceData> {
    // symbol XAUUSD veya XAUTRY formatında bekleniyor
    const instrument = symbol.slice(0, 3);
    const currency = symbol.slice(3);
    const url = `${SWISSQUOTE_API_BASE_URL}/public-quotes/bboquotes/instrument/${instrument}/${currency}`;

    try {
      const response = await axios.get<SwissquotePlatformData[]>(url);
      const data = response.data;

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response structure from Swissquote API');
      }

      // 'SwissquoteLtd' platformunu ve 'elite' veya 'prime' profilini önceliklendir
      const platform = data.find(p => p.topo?.platform === 'SwissquoteLtd') || data[0];
      if (!platform || !platform.spreadProfilePrices || platform.spreadProfilePrices.length === 0) {
        throw new Error('No price data found in Swissquote response');
      }

      const profile =
        platform.spreadProfilePrices.find(p => p.spreadProfile === 'elite') ||
        platform.spreadProfilePrices.find(p => p.spreadProfile === 'prime') ||
        platform.spreadProfilePrices[0];
      
      if (!profile) {
        throw new Error('No suitable price profile found in Swissquote response');
      }

      const price = (profile.bid + profile.ask) / 2;

      // Bu API geçmiş veri sağlamadığı için değişim 0 olarak ayarlanır
      const result: PriceData = {
        symbol, // <- Sembol eklendi
        price,
        change: 0,
        changePercent: 0,
        previousClose: price,
        historicalData: [],
        name: symbol,
        currency,
        lastUpdate: new Date().toISOString(),
      };
      return result;
    } catch (error) {
      const errorMessage = `Could not fetch price for ${symbol} from Swissquote`;
      console.error(errorMessage, error);
      // Hata durumunda her zaman PriceData nesnesi döndür
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        historicalData: [],
        name: symbol,
        currency,
        error: errorMessage,
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  // Yahoo Finance'den tek bir sembol için fiyat çek (dahili kullanım)
  private async fetchYahooPrice(symbol: string): Promise<PriceData> {
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
        
        const indicators = result.indicators?.quote?.[0];
        const adjCloseData = result.indicators?.adjclose?.[0];
        const closePrices = indicators?.close?.filter((price): price is number => price != null) || [];
        
        const currentPrice = meta.regularMarketPrice;

        if (currentPrice == null) {
          console.warn(`⚠️ ${symbol}: regularMarketPrice is missing.`);
          return {
            symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            previousClose: 0,
            historicalData: [],
            lastUpdate: new Date().toISOString(),
            error: 'Fiyat verisi eksik', // Hata mesajı eklendi
          };
        }
        
        // Önceki kapanış fiyatını belirlemek için en sağlam yöntem:
        // Her zaman tarihsel kapanış fiyatlarını birincil kaynak olarak kullan.
        let previousClose: number | null = null;

        if (closePrices.length >= 2) {
          // Listenin sonundaki fiyat en güncel kapanış, sondan ikinci ise bir önceki günün kapanışıdır.
          // Bazen en güncel kapanış, gün içi bir veri olabilir. Bu yüzden her zaman sondan ikinciyi almak daha güvenilirdir.
          previousClose = closePrices[closePrices.length - 2];
        } else {
          // Eğer geçmiş veri yetersizse, meta verisine fallback yap.
          previousClose = meta.previousClose;
        }

        // Eğer hiçbir şekilde önceki kapanış bulunamazsa, sıfır değişim için mevcut fiyata dön
        if (previousClose == null) {
            console.warn(`⚠️ ${symbol}: Önceki kapanış fiyatı belirlenemedi. Değişim 0 olarak ayarlandı.`);
            previousClose = currentPrice;
        }
        
        let change: number;
        let changePercent: number;

        // GMSTR için özel değişim hesaplaması (açılışa göre)
        if (symbol === 'GMSTR.IS') {
          const openPrices = indicators?.open?.filter((p): p is number => p !== null) || [];
          const adjClosePrices = adjCloseData?.adjclose?.filter((p): p is number => p !== null) || [];

          if (adjClosePrices.length > 0 && openPrices.length > 0) {
            const priceToCompare = adjClosePrices[adjClosePrices.length - 1];
            const baselinePrice = openPrices[openPrices.length - 1];
            change = priceToCompare - baselinePrice;
            changePercent = baselinePrice !== 0 ? (change / baselinePrice) * 100 : 0;
          } else {
            // Veri eksikse standart hesaplamaya dön
            change = currentPrice - previousClose;
            changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
          }
        } else {
          // Diğer tüm varlıklar için standart değişim hesaplaması (dünkü kapanışa göre)
          change = currentPrice - previousClose;
          changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
        }
        
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
          previousClose: previousClose, // <- previousClose eklendi
          lastUpdate: new Date().toISOString(),
          name: meta.shortName || meta.symbol,
        };
      }
    } catch (error) {
      const errorMessage = `Fiyat alınamadı (${symbol})`;
      console.error(`❌ Yahoo Finance error for ${symbol}:`, error);
      return { // Hata durumunda her zaman PriceData nesnesi ve hata mesajı döndür
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        historicalData: [],
        lastUpdate: new Date().toISOString(),
        error: errorMessage,
      };
    }

    return {
      symbol, // <- Sembol eklendi
      price: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      historicalData: [],
      lastUpdate: new Date().toISOString(),
      error: 'Bilinmeyen bir hata oluştu', // Hata mesajı eklendi
    };
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

// Gerçek servis örneği
const realPriceService = PriceService.getInstance();

// Mock servis importu
import { MockPriceService } from './mockPriceService';
import { USE_MOCK_API } from '../utils/config';

// Hangi servisin kullanılacağını belirle
const priceServiceToUse = USE_MOCK_API 
  ? MockPriceService.getInstance() 
  : realPriceService;

// Seçilen servisi export et
export const priceService = priceServiceToUse as unknown as PriceService; 