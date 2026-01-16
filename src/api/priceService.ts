import axios from 'axios';
import type { PriceData, HistoricalPrice, AssetType } from '../models/types';
import { tefasService } from './tefasService';
import { USE_MOCK_API, config } from '../utils/config';
import { mockAxiosGet } from './mockApiService';

// Twelve Data API response types (spot XAU/USD historical için)
interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency_base: string;
    currency_quote: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
  }>;
  status: string;
}

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
  // private cache: Map<string, { data: PriceData; timestamp: number }> = new Map(); Artık Redux'ta
  private readonly CACHE_DURATION = 60000; // 1 dakika

  // Twelve Data spot metal sonuçlarını cache'le (rate limit aşımını önlemek için)
  private spotMetalCache: Map<string, { data: { current: number; previous: number; changePercent: number }; timestamp: number }> = new Map();
  private readonly SPOT_METAL_CACHE_DURATION = 60000; // 1 dakika

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  public static getAssetTypeFromSymbol(symbol: string): AssetType {
    // Özel ve kesin listeler en önce kontrol edilmeli.
    // Kural: Değerli metaller
    // GAUTRY'yi önceliklendir, çünkü GAU bir fon koduyla çakışıyor.
    if (['GAUTRY', 'XAUUSD'].includes(symbol)) {
      return 'COMMODITY';
    }

    // Kural: Döviz çiftleri
    if (['USDTRY', 'EURTRY', 'XAGTRY', 'TRY'].includes(symbol)) {
      return 'CURRENCY';
    }

    // Kural: Fonlar 3 büyük harfli kodlardır. (Örn: YAS, IPJ, GAU)
    if (symbol.length === 3 && symbol.toUpperCase() === symbol) {
      return 'FUND';
    }
  
    // Kural: BIST hisseleri ".IS" eki alır.
    if (PriceService.transformSymbol(symbol).endsWith('.IS')) {
      return 'STOCK';
    }
  
    // Varsayılan olarak CURRENCY döndür veya daha spesifik kurallar ekle
    return 'CURRENCY';
  }

  /**
   * Verilen bir tarihin BIST piyasa saatleri (UTC 07:00-15:30) içinde olup olmadığını kontrol eder.
   * @param date Kontrol edilecek tarih nesnesi.
   * @returns Piyasa açıksa true, değilse false.
   */
  public static isStockMarketHours(date: Date): boolean {
    const day = date.getUTCDay(); // Pazar=0, Ctesi=6
    const utcHour = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Piyasa saatleri Turkey Time (UTC+3): 10:00 - 18:30 arası.
    // UTC karşılığı: 07:00 - 15:10 arası.
    return (
      day > 0 && day < 6 && // Hafta içi mi?
      (
        (utcHour >= 7 && utcHour < 15) || // 07:00 - 14:59 UTC
        (utcHour === 15 && utcMinutes <= 30) // 15:00 - 15:30 UTC
      )
    );
  }

  /**
   * Bir fonun fiyat tarihinin, kontrol anına göre geçerli olup olmadığını belirler.
   * Hafta içi, fiyat tarihi bugüne ait olmalıdır.
   * Hafta sonu, fiyat tarihi son Cuma gününe aitse de geçerlidir.
   * @param priceDate Fiyatın tarihi (YYYY-MM-DD formatında).
   * @param today Kontrolün yapıldığı anın tarih nesnesi.
   * @returns Fiyat tarihi geçerliyse true, değilse false.
   */
  public static isFundPriceDateValid(priceDate: string, today: Date): boolean {
    const dayOfWeek = today.getDay(); // Pazar: 0, Cmt: 6
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayString = getLocalDateString(today);

    // Hafta içi: Fiyat tarihi kesinlikle bugün olmalı.
    if (!isWeekend) {
      return priceDate === todayString;
    }

    // Hafta sonu: Fiyat tarihi son Cuma gününe aitse de geçerlidir.
    const lastFriday = new Date(today);
    const daysToSubtract = dayOfWeek === 6 ? 1 : 2; // Cmt için 1, Pazar için 2 gün çıkar
    lastFriday.setDate(today.getDate() - daysToSubtract);
    const lastFridayString = getLocalDateString(lastFriday);
    
    return priceDate === lastFridayString;
  }

  public static transformSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'USDTRY': 'USDTRY=X',
      'EURTRY': 'EURTRY=X',
      'XAGTRY': 'XAGTRY=X', // Gümüş / TL
    };

    // Öncelikle özel eşleştirmelere bak
    if (symbolMap[symbol]) {
      return symbolMap[symbol];
    }

    // Türk varlıkları için sembol dönüşümü
    if (/^[A-Z]{3,6}$/.test(symbol) && !symbol.includes('=') && !symbol.includes('.')) {
      return `${symbol}.IS`;
    }

    // Değişiklik yoksa orijinal sembolü dön
    return symbol;
  }

  public isCacheValid(
    symbol: string, 
    timestamp: number, 
    cachedData?: PriceData
  ): boolean {
    const assetType = PriceService.getAssetTypeFromSymbol(symbol);
    const now = new Date();
    const cacheDate = new Date(timestamp);
    
    // --- Standart Önbellek Geçerlilik Mantığı ---
    switch (assetType) {
      case 'FUND': {
        // Fonlar için önbelleğin geçerli sayılması için, verinin FİYAT TARİHİNİN bugüne ait olması gerekir.
        // Bu, TEFAS'ın bir gün önceki veriyi dönmesi durumunda önbelleğin kullanılmasını engeller.
        if (cachedData?.priceDate) {
          return PriceService.isFundPriceDateValid(cachedData.priceDate, now);
        }

        // priceDate yoksa (eski veri veya başka bir sorun), standart gün kontrolü yap.
        return now.toDateString() === cacheDate.toDateString();
      }
  
      case 'STOCK': {
        const isMarketHours = PriceService.isStockMarketHours(now);
  
        if (isMarketHours) {
          // Piyasa açıkken: Kısa süreli önbellek (1 dk)
          return now.getTime() - timestamp < this.CACHE_DURATION;
        } else {
          // Piyasa kapalıyken:
          const cacheWasDuringMarketHours = PriceService.isStockMarketHours(cacheDate);
          const sameDay = now.toDateString() === cacheDate.toDateString();

          // Eğer piyasa yeni kapandıysa ve önbellek piyasa açıkken oluşturulduysa,
          // kapanış verisini çekmek için önbelleği bir kereliğine geçersiz kıl.
          if (sameDay && cacheWasDuringMarketHours) {
            return false; // Kapanış verisi için önbelleği geçersiz kıl
          }

          // Aksi halde (önbellek zaten piyasa kapalıyken oluşturulduysa veya başka bir gün ise),
          // sadece gün kontrolü yap.
          return sameDay;
        }
      }
  
      case 'CURRENCY':
      case 'COMMODITY':
      default: {
        const isValid = now.getTime() - timestamp < this.CACHE_DURATION;
        return isValid;
      }
    }
  }

  async fetchHistoricalPrices(
    symbol: string,
    range: '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y'| '5y' = '1mo'
  ): Promise<HistoricalPrice[]> {
    // GAUTRY (Gram Altın TRY) için özel hesaplama
    if (symbol === 'GAUTRY' || symbol === 'GAU') {
      return this.fetchGoldHistoricalPrices(range);
    }

    // Eğer fon ise, her zaman TEFAS servisini kullan
    if (PriceService.getAssetTypeFromSymbol(symbol) === 'FUND') { // Statik metoda çevrildi
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
      const response = USE_MOCK_API
        ? await mockAxiosGet(url.replace('/api/yahoo', 'https://query1.finance.yahoo.com'))
        : await axios.get<YahooChartResponse>(url, {
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
    // Önbellek kontrolü ve yönetimi artık usePrices hook'unda yapılıyor.
    // Bu servis sadece veri çekme ve işleme görevini üstlenir.

    console.log(`[API] Fetching new data for ${symbol}.`);

    if (symbol === 'TRY') {
      const tryData: PriceData = {
        symbol: 'TRY',
        price: 1,
        change: 0,
        changePercent: 0,
        previousClose: 1,
        historicalData: [],
        lastUpdate: new Date().toISOString(),
        source: 'api', // Kaynak bilgisi
      };
      // this.cache.set(symbol, { data: tryData, timestamp: Date.now() });
      return tryData;
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
          // Eğer TEFAS o gün için henüz fiyat açıklamadıysa (fiyat=0),
          // bu veriyi cache'leme. Bu sayede bir sonraki istekte tekrar denenir.
          if (fundPrice.price === 0) {
            console.warn(`[API] Zero price for fund ${symbol}. Not caching.`);
            return { ...fundPrice, source: 'api' as const }; // Cache'lemeden dön
          }

          // Fon fiyatı bulundu ve 0'dan farklı, cache'e ekle ve dön
          const apiData = { ...fundPrice, source: 'api' as const };
          // this.cache.set(symbol, { data: apiData, timestamp: Date.now() });
          return apiData;
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
    if (yahooData && !yahooData.error) {
      // fetchYahooPrice dönüşünde sembol değişmiş olabilir; orijinal sembolü geri yaz
      const priceData: PriceData = { ...yahooData, symbol, source: 'api' };

      // Cache'e kaydetme işlemi artık usePrices hook'unda
      // this.cache.set(symbol, { data: { ...priceData, source: undefined }, timestamp: Date.now() });
      return priceData;
    }

    // Eğer yahooData bir hata nesnesi içeriyorsa, onu doğrudan dön
    if (yahooData?.error) {
      return { ...yahooData, symbol };
    }

    // Diğer tüm durumlarda genel bir hata mesajı dön
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

  // Altın için özel çevrim: XAU/USD (spot ons altın) -> Gram altın TRY
  private async fetchGoldPrice(symbol: string): Promise<PriceData> {
    try {
      // 1 ons = 31.1035 gram
      const OUNCE_TO_GRAM = 31.1035;

      // GAUTRY'nin bağımlılıklarını paralel çek:
      // - Anlık ons: Swissquote (spot)
      // - Dünkü ons: Twelve Data (spot) - Yahoo GC=F vadeli olduğu için kullanmıyoruz!
      // - USDTRY: Yahoo
      const [
        ounceUsdSwissquoteResponse,
        previousOunceUsdFromTwelveData,
        usdTryResponse,
      ] = await Promise.all([
        this.fetchSwissquotePrice('XAUUSD'),
        this.fetchTwelveDataPreviousClose(), // Dünkü SPOT ons fiyatı (Twelve Data)
        this.fetchYahooPrice('USDTRY=X'),
      ]);

      // Gelen verilerin geçerliliğini kontrol et
      if (!ounceUsdSwissquoteResponse || ounceUsdSwissquoteResponse.price === 0) {
        throw new Error('Could not fetch current XAUUSD price from Swissquote');
      }
      if (!usdTryResponse || usdTryResponse.price === 0) {
        throw new Error('Could not fetch USDTRY exchange rate');
      }

      // ANLIK FİYAT HESAPLAMASI
      const currentOuncePriceUSD = ounceUsdSwissquoteResponse.price;
      const currentUsdTryRate = usdTryResponse.price;
      const gramPriceTRY = (currentOuncePriceUSD * currentUsdTryRate) / OUNCE_TO_GRAM;

      // DÜNKÜ FİYAT HESAPLAMASI
      // Twelve Data'dan gelen spot fiyatı kullan, yoksa anlık fiyata fallback
      const previousOuncePriceUSD = previousOunceUsdFromTwelveData ?? currentOuncePriceUSD;
      const previousUsdTryRate = usdTryResponse.previousClose ?? usdTryResponse.price;
      const previousGramPriceTRY = (previousOuncePriceUSD * previousUsdTryRate) / OUNCE_TO_GRAM;

      // DEĞİŞİM HESAPLAMASI
      const change = gramPriceTRY - previousGramPriceTRY;
      const changePercent = previousGramPriceTRY !== 0 ? (change / previousGramPriceTRY) * 100 : 0;

      // Debug log
      console.log('🥇 Gram Altın Hesaplama:', {
        'Anlık Ons (Swissquote)': currentOuncePriceUSD,
        'Dünkü Ons (TwelveData)': previousOunceUsdFromTwelveData,
        'USDTRY': currentUsdTryRate,
        'Dünkü USDTRY': previousUsdTryRate,
        'Gram TRY': gramPriceTRY.toFixed(2),
        'Dünkü Gram TRY': previousGramPriceTRY.toFixed(2),
        'Değişim %': changePercent.toFixed(2),
      });

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
        source: 'api', // -> İkonun görünmesi için kaynak bilgisi eklendi
      };
      // Altın fiyatının kendisi, anlık hesaplandığı için cache'lenmez.
      // Cache'leme sorumluluğu usePrices'tadır.
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
        source: 'api', // -> Hata durumunda da kaynak bilgisi ekleniyor
      };
    }
  }

  /**
   * Gram Altın (GAUTRY) için historical veri çeker.
   * Twelve Data XAU/USD + Yahoo USDTRY verilerini birleştirerek hesaplar.
   */
  private async fetchGoldHistoricalPrices(
    range: '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y'
  ): Promise<HistoricalPrice[]> {
    const OUNCE_TO_GRAM = 31.1035;
    const apiKey = config.api.twelveDataApiKey;

    if (!apiKey) {
      console.warn('⚠️ Twelve Data API key tanımlı değil.');
      return [];
    }

    // Range'e göre outputsize belirle (biraz fazla çek, eksik gün olmasın)
    const outputSizeMap: Record<string, number> = {
      '1d': 5,
      '1w': 14,
      '1mo': 45,
      '3mo': 120,
      '6mo': 200,
      '1y': 400,
      '3y': 1200,
      '5y': 2000,
    };
    const outputSize = outputSizeMap[range] || 45;

    // Yahoo range'i de biraz geniş tutalım
    const yahooRangeMap: Record<string, string> = {
      '1d': '5d',
      '1w': '1mo',
      '1mo': '3mo',
      '3mo': '6mo',
      '6mo': '1y',
      '1y': '2y',
      '3y': '5y',
      '5y': '10y',
    };
    const yahooRange = yahooRangeMap[range] || '3mo';

    try {
      // Twelve Data'dan XAU/USD ve Yahoo'dan USDTRY paralel çek
      const [xauResponse, usdTryData] = await Promise.all([
        axios.get<TwelveDataTimeSeriesResponse>(
          `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1day&outputsize=${outputSize}&apikey=${apiKey}`,
          { timeout: 15000 }
        ),
        this.fetchYahooHistoricalForGold(yahooRange as any),
      ]);

      if (xauResponse.data?.status !== 'ok' || !xauResponse.data.values) {
        console.warn('⚠️ Twelve Data XAU/USD verisi alınamadı');
        return [];
      }

      // USDTRY verilerini tarih bazlı map'e çevir ve sıralı tarih listesi oluştur
      const usdTryMap = new Map<string, number>();
      const usdTryDates: string[] = [];
      usdTryData.forEach(item => {
        usdTryMap.set(item.date, item.price);
        usdTryDates.push(item.date);
      });
      usdTryDates.sort();

      // En yakın USDTRY tarihini bul
      const findClosestUsdTry = (targetDate: string): number | null => {
        // Önce exact match dene
        if (usdTryMap.has(targetDate)) {
          return usdTryMap.get(targetDate)!;
        }
        // Yoksa en yakın önceki tarihi bul
        let closest: string | null = null;
        for (const date of usdTryDates) {
          if (date <= targetDate) {
            closest = date;
          } else {
            break;
          }
        }
        return closest ? usdTryMap.get(closest)! : null;
      };

      // XAU/USD ve USDTRY'yi birleştirerek gram altın TRY hesapla
      const historicalData: HistoricalPrice[] = [];

      for (const xauItem of xauResponse.data.values) {
        const date = xauItem.datetime.split(' ')[0]; // "2025-01-10 00:00:00" -> "2025-01-10"
        const xauPrice = parseFloat(xauItem.close);
        const usdTryPrice = findClosestUsdTry(date);

        if (usdTryPrice && !isNaN(xauPrice)) {
          const gramPriceTry = (xauPrice * usdTryPrice) / OUNCE_TO_GRAM;
          historicalData.push({
            date,
            price: gramPriceTry,
          });
        }
      }

      // Tarihe göre sırala (eskiden yeniye)
      historicalData.sort((a, b) => a.date.localeCompare(b.date));

      // İstenen aralığa göre filtrele
      const now = new Date();
      const rangeDaysMap: Record<string, number> = {
        '1d': 1,
        '1w': 7,
        '1mo': 31,
        '3mo': 93,
        '6mo': 186,
        '1y': 366,
        '3y': 1100,
        '5y': 1830,
      };
      const rangeDays = rangeDaysMap[range] || 31;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - rangeDays);
      const startDateStr = startDate.toISOString().split('T')[0];

      const filteredData = historicalData.filter(item => item.date >= startDateStr);

      console.log(`✅ GAUTRY historical (${range}):`, {
        'Toplam veri': historicalData.length,
        'Filtrelenmiş': filteredData.length,
        'Başlangıç filtre': startDateStr,
        'İlk tarih': filteredData[0]?.date,
        'Son tarih': filteredData[filteredData.length - 1]?.date,
        'İlk fiyat': filteredData[0]?.price?.toFixed(2),
        'Son fiyat': filteredData[filteredData.length - 1]?.price?.toFixed(2),
      });
      return filteredData;
    } catch (error) {
      console.error('❌ GAUTRY historical veri hatası:', error);
      return [];
    }
  }

  /**
   * Yahoo'dan USDTRY historical verisi çeker (GAUTRY hesaplaması için).
   */
  private async fetchYahooHistoricalForGold(
    range: '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y'
  ): Promise<HistoricalPrice[]> {
    const url = `${API_BASE_URL}/USDTRY=X?range=${range}&interval=1d`;

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
      console.error('❌ Yahoo USDTRY historical hatası:', error);
      return [];
    }
  }

  /**
   * Gram metal TRY değişim yüzdesini hesaplar.
   * GLDTR ve GMSTR için Yahoo'dan gelen hatalı değişim yerine,
   * spot metal fiyatı * USDTRY ile hesaplanan gram TRY değişimini kullanır.
   * @param metal 'XAU' (altın) veya 'XAG' (gümüş)
   */
  private async fetchGramMetalChangeTRY(metal: 'XAU' | 'XAG'): Promise<{ changePercent: number } | null> {
    const OUNCE_TO_GRAM = 31.1035;

    try {
      // Paralel olarak spot metal ve USDTRY verilerini çek
      const [spotMetalChange, usdTryResponse] = await Promise.all([
        this.fetchSpotMetalChange(metal),
        this.fetchYahooPrice('USDTRY=X'),
      ]);

      if (!spotMetalChange || !usdTryResponse || usdTryResponse.price === 0) {
        console.warn(`⚠️ Gram ${metal} TRY hesaplaması için veri alınamadı`);
        return null;
      }

      // Anlık ve dünkü gram TRY fiyatlarını hesapla
      const currentUsdTry = usdTryResponse.price;
      const previousUsdTry = usdTryResponse.previousClose ?? currentUsdTry;

      const currentGramTRY = (spotMetalChange.current * currentUsdTry) / OUNCE_TO_GRAM;
      const previousGramTRY = (spotMetalChange.previous * previousUsdTry) / OUNCE_TO_GRAM;

      // Değişim yüzdesini hesapla
      const changePercent = previousGramTRY !== 0
        ? ((currentGramTRY - previousGramTRY) / previousGramTRY) * 100
        : 0;

      console.log(`✅ Gram ${metal} TRY değişimi:`, {
        'Anlık Metal USD': spotMetalChange.current,
        'Dünkü Metal USD': spotMetalChange.previous,
        'Anlık USDTRY': currentUsdTry,
        'Dünkü USDTRY': previousUsdTry,
        'Anlık Gram TRY': currentGramTRY.toFixed(2),
        'Dünkü Gram TRY': previousGramTRY.toFixed(2),
        'Değişim %': changePercent.toFixed(2),
      });

      return { changePercent };
    } catch (error) {
      console.error(`❌ Gram ${metal} TRY değişim hesaplama hatası:`, error);
      return null;
    }
  }

  /**
   * Twelve Data API'den spot metal değişim yüzdesini hesaplar.
   * Sonuçlar cache'lenir (rate limit aşımını önlemek için).
   * @param metal 'XAU' (altın) veya 'XAG' (gümüş)
   */
  private async fetchSpotMetalChange(metal: 'XAU' | 'XAG'): Promise<{ current: number; previous: number; changePercent: number } | null> {
    // Önce cache'e bak
    const cached = this.spotMetalCache.get(metal);
    if (cached && Date.now() - cached.timestamp < this.SPOT_METAL_CACHE_DURATION) {
      console.log(`📦 Twelve Data ${metal}/USD cache'den alındı`);
      return cached.data;
    }

    const apiKey = config.api.twelveDataApiKey;
    if (!apiKey) {
      console.warn('⚠️ Twelve Data API key tanımlı değil.');
      return null;
    }

    const symbol = `${metal}/USD`;
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=5&apikey=${apiKey}`;

    try {
      const response = await axios.get<TwelveDataTimeSeriesResponse>(url, {
        timeout: 10000,
      });

      console.log(`🔍 Twelve Data ${symbol} raw response:`, response.data);

      if (response.data?.status === 'ok' && response.data.values?.length >= 2) {
        const current = parseFloat(response.data.values[0].close);
        const previous = parseFloat(response.data.values[1].close);
        const changePercent = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

        const result = { current, previous, changePercent };

        // Cache'e kaydet
        this.spotMetalCache.set(metal, { data: result, timestamp: Date.now() });

        console.log(`✅ Twelve Data ${symbol}:`, { current, previous, changePercent: changePercent.toFixed(2) + '%' });
        return result;
      }

      console.warn(`⚠️ Twelve Data ${symbol} geçersiz yanıt - status: ${response.data?.status}, values length: ${response.data?.values?.length}`);
      return null;
    } catch (error) {
      console.error(`❌ Twelve Data ${symbol} hatası:`, error);
      return null;
    }
  }

  /**
   * Twelve Data API'den dünkü spot XAU/USD kapanış fiyatını çeker.
   * Bu, Yahoo'daki GC=F (vadeli) yerine gerçek spot fiyatı sağlar.
   */
  private async fetchTwelveDataPreviousClose(): Promise<number | null> {
    const result = await this.fetchSpotMetalChange('XAU');
    return result?.previous ?? null;
  }

  private async fetchSwissquotePrice(symbol: string): Promise<PriceData> {
    // symbol XAUUSD veya XAUTRY formatında bekleniyor
    const instrument = symbol.slice(0, 3);
    const currency = symbol.slice(3);
    const url = `${SWISSQUOTE_API_BASE_URL}/public-quotes/bboquotes/instrument/${instrument}/${currency}`;

    try {
      const response = USE_MOCK_API
        ? await mockAxiosGet(url.replace('/api/swissquote', 'https://forex-data-feed.swissquote.com'))
        : await axios.get<SwissquotePlatformData[]>(url);
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
        platform.spreadProfilePrices.find((p: SwissquoteProfilePrice) => p.spreadProfile === 'elite') ||
        platform.spreadProfilePrices.find((p: SwissquoteProfilePrice) => p.spreadProfile === 'prime') ||
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
      const response = USE_MOCK_API
        ? await mockAxiosGet(url.replace('/api/yahoo', 'https://query1.finance.yahoo.com'))
        : await axios.get<YahooChartResponse>(url, {
            timeout: 15000,
            headers: { 'Accept': 'application/json' },
          });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const meta = result.meta;
        
        const indicators = result.indicators?.quote?.[0];
        const closePrices = indicators?.close?.filter((price: number | null): price is number => price != null) || [];
        
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
        let previousCloseSource: number | undefined;

        if (closePrices.length >= 2) {
          // Listenin sonundaki fiyat en güncel kapanış, sondan ikinci ise bir önceki günün kapanışıdır.
          previousCloseSource = closePrices[closePrices.length - 2];
        } else {
          // Eğer geçmiş veri yetersizse, meta verisine fallback yap.
          previousCloseSource = meta.previousClose;
        }

        // Eğer hiçbir şekilde önceki kapanış bulunamazsa, sıfır değişim için mevcut fiyata dön
        if (previousCloseSource == null) { // null veya undefined kontrolü
            console.warn(`⚠️ ${symbol}: Önceki kapanış fiyatı belirlenemedi. Değişim 0 olarak ayarlandı.`);
        }
        
        const previousClose = previousCloseSource ?? currentPrice;
        
        let change: number;
        let changePercent: number;

        // GLDTR ve GMSTR için gram metal TRY değişimi kullan (Yahoo'dan gelen değişim hatalı)
        if (symbol === 'GLDTR.IS' || symbol === 'GMSTR.IS') {
          const metal = symbol === 'GLDTR.IS' ? 'XAU' : 'XAG';
          const gramMetalChange = await this.fetchGramMetalChangeTRY(metal);

          if (gramMetalChange) {
            // Gram metal TRY değişim yüzdesini kullan
            changePercent = gramMetalChange.changePercent;
            change = currentPrice * (changePercent / 100);
            console.log(`🔧 ${symbol} gram ${metal === 'XAU' ? 'altın' : 'gümüş'} TRY değişimi kullanılıyor:`, changePercent.toFixed(2) + '%');
          } else {
            // Gram TRY veri alınamazsa standart hesaplamaya dön
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

      // Eğer API'den geçerli bir sonuç gelmezse, hata olarak işaretle
      const errorMessage = `Geçersiz API yanıtı (${symbol})`;
      console.warn(`⚠️ ${errorMessage}`);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        historicalData: [],
        lastUpdate: new Date().toISOString(),
        error: errorMessage,
      };

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
  }
}

// Gerçek servis örneği
const realPriceService = PriceService.getInstance();

// Mock servis artık kullanılmıyor, yeni mockApiService mekanizması var.
// import { MockPriceService } from './mockPriceService';

// Hangi servisin kullanılacağını belirle
// const priceServiceToUse = USE_MOCK_API 
//   ? MockPriceService.getInstance() 
//   : realPriceService;

// Seçilen servisi export et
export const priceService = realPriceService;