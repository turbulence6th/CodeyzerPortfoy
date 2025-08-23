import axios from 'axios';
import dayjs from 'dayjs';
import type { PriceData, HistoricalPrice } from '../models/types';
import { USE_MOCK_API } from '../utils/config';
import { mockAxiosGet } from './mockApiService';

export type FundHistoryItem = {
  TARIH: string;
  FONKODU: string;
  FONUNVAN: string;
  FIYAT: number;
  TEDPAYSAYISI: number;
  KISISAYISI: number;
  PORTFOYBUYUKLUK: number;
  BORSABULTENFIYAT: string;
};

type TefasApiResponse = {
  data?: FundHistoryItem[];
};

// TEFAS yatırım fonu fiyatlarını çeken servis
export class TefasService {
  private static instance: TefasService;
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 dakika (daha uzun cache)
  private pendingRequests: Map<string, Promise<PriceData | null>> = new Map(); // Aynı istek tekrarını engelle
  private requestHistory: Map<string, number> = new Map(); // Rate limiting için
  private readonly MIN_REQUEST_INTERVAL = 5000; // 5 saniye minimum interval

  private constructor() {}

  static getInstance(): TefasService {
    if (!TefasService.instance) {
      TefasService.instance = new TefasService();
    }
    return TefasService.instance;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private canMakeRequest(fundCode: string): boolean {
    const lastRequest = this.requestHistory.get(fundCode);
    if (!lastRequest) return true;
    return Date.now() - lastRequest >= this.MIN_REQUEST_INTERVAL;
  }

  private setRequestHistory(fundCode: string): void {
    this.requestHistory.set(fundCode, Date.now());
  }

  // Çoklu fon fiyatlarını tek tek çek (rate limiting ile)
  async fetchMultipleFundPrices(fundCodes: string[]): Promise<Record<string, PriceData>> {
    const results: Record<string, PriceData> = {};
    
    if (fundCodes.length === 0) return results;

    console.log(`📊 TEFAS tek tek request için ${fundCodes.length} fon:`, fundCodes);

    // Önce cache'i kontrol et
    const toFetch: string[] = [];
    for (const fundCode of fundCodes) {
      const cached = this.cache.get(fundCode);
      if (cached && this.isCacheValid(cached.timestamp)) {
        results[fundCode] = cached.data;
      } else {
        toFetch.push(fundCode);
      }
    }

    console.log(`📊 Cache'den ${Object.keys(results).length}, API'den ${toFetch.length} fon çekilecek`);

    // Tek tek fetch et (rate limiting ile)
    for (let i = 0; i < toFetch.length; i++) {
      const fundCode = toFetch[i];
      
      try {
        const result = await this.fetchFundPrice(fundCode);
        if (result) {
          results[fundCode] = result;
        }
        
        // Son istek değilse bekle (rate limiting)
        if (i < toFetch.length - 1) {
          await this.delay(100); // 100ms bekle
        }
      } catch (error) {
        console.warn(`TEFAS tek istek hatası ${fundCode}:`, error);
      }
    }

    console.log(`✅ TEFAS sonuç: ${Object.keys(results).length}/${fundCodes.length} başarılı`);
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchFundPrice(fundCode: string): Promise<PriceData | null> {
    // Cache kontrolü
    const cached = this.cache.get(fundCode);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Rate limiting kontrolü
    if (!this.canMakeRequest(fundCode)) {
      console.log(`TEFAS: Rate limit, cache'den dönüyor (${fundCode})`);
      return cached?.data || null;
    }

    // Aynı istek zaten beklemede mi?
    const pending = this.pendingRequests.get(fundCode);
    if (pending) {
      console.log(`TEFAS: Pending request beklemede (${fundCode})`);
      return pending;
    }

    // Yeni istek oluştur
    const request = this.performSingleFundRequest(fundCode);
    this.pendingRequests.set(fundCode, request);

    try {
      const result = await request;
      this.setRequestHistory(fundCode);
      return result;
    } finally {
      this.pendingRequests.delete(fundCode);
    }
  }

  /**
   * TEFAS'tan gelen ham geçmiş veriyi işleyerek standart bir PriceData nesnesine dönüştürür.
   * - En güncel fiyatı bulur.
   * - Eğer en güncel fiyat 0 ise veya o güne ait veri yoksa, bir önceki günün fiyatını kullanır.
   * - Fiyatın hangi güne ait olduğunu priceDate alanında belirtir.
   * @param history TEFAS API'sinden gelen, tarihe göre sıralanmamış ham veri dizisi.
   * @param fundCode İşlem yapılan fonun kodu.
   * @returns İşlenmiş PriceData nesnesi veya veri yetersizse null.
   */
  public static processFundHistory(history: FundHistoryItem[], fundCode: string): PriceData | null {
    if (!history || history.length === 0) {
      console.warn(`TEFAS: Veri bulunamadı (${fundCode})`);
      return null;
    }

    // Tarihe göre en yeniden en eskiye doğru sırala
    const sortedHistory = [...history].sort((a, b) => parseInt(b.TARIH) - parseInt(a.TARIH));

    const latest = sortedHistory[0];
    const previous = sortedHistory.length > 1 ? sortedHistory[1] : null;

    // Kural: En güncel fiyat 0'dan büyükse onu kullan. Değilse, bir önceki günü kullan.
    const usePreviousAsLatest = latest.FIYAT === 0 && previous;
    const effectiveData = usePreviousAsLatest ? previous! : latest;
    
    // Değişim hesaplaması için kullanılacak olan, "effective" veriden bir önceki veri
    const comparisonData = usePreviousAsLatest 
      ? (sortedHistory.length > 2 ? sortedHistory[2] : null) // Eğer düne ait veriyi kullanıyorsak, evvelsi günle karşılaştır
      : previous; // Eğer bugüne ait veriyi kullanıyorsak, dünle karşılaştır

    const price = effectiveData.FIYAT;
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn(`TEFAS: Fiyat geçersiz (${fundCode}):`, price);
      return null;
    }
    
    let change = 0;
    let changePercent = 0;
    let previousClose: number | undefined = undefined;
    
    if (comparisonData && typeof comparisonData.FIYAT === 'number' && comparisonData.FIYAT > 0) {
      previousClose = comparisonData.FIYAT;
      change = price - previousClose;
      changePercent = (change / previousClose) * 100;
    }

    const historicalData: HistoricalPrice[] = sortedHistory
      .map((item: FundHistoryItem) => ({
        date: new Date(parseInt(item.TARIH)).toISOString().split('T')[0],
        price: item.FIYAT,
      }))
      .reverse();

    const priceData: PriceData = {
      symbol: fundCode,
      price,
      change,
      changePercent,
      previousClose,
      lastUpdate: new Date().toISOString(),
      name: effectiveData.FONUNVAN,
      historicalData,
      priceDate: new Date(parseInt(effectiveData.TARIH)).toISOString().split('T')[0],
    };

    return priceData;
  }

  private async performSingleFundRequest(fundCode: string): Promise<PriceData | null> {
    const isDevelopment = import.meta.env.DEV;
    const endpoint = isDevelopment
      ? '/api/tefas/api/DB/BindHistoryInfo'
      : 'https://www.tefas.gov.tr/api/DB/BindHistoryInfo';

    // TEFAS API formatı: gün/ay/yıl
    const today = dayjs().format('DD.MM.YYYY');
    const weekAgo = dayjs().subtract(7, 'days').format('DD.MM.YYYY'); // 1 haftalık sorgu

    const formData = new URLSearchParams();
    formData.append('fontip', 'YAT'); // Yatırım fonları
    formData.append('bastarih', weekAgo);
    formData.append('bittarih', today);
    formData.append('fonkod', fundCode);

    try {
      const response = USE_MOCK_API
        ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
        : await axios.post<TefasApiResponse>(endpoint, formData, {
            headers: {
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 15000,
          });

      const items = response.data?.data;
      const priceData = TefasService.processFundHistory(items || [], fundCode);

      if (priceData) {
        this.cache.set(fundCode, { data: priceData, timestamp: Date.now() });
      }
      
      return priceData;
    } catch (error) {
      console.error('TEFAS API hatası:', error);
      return null;
    }
  }

  async fetchHistoricalFundPrices(
    fundCode: string,
    range: '1w' | '1mo' | '3mo'
  ): Promise<HistoricalPrice[]> {
    const isDevelopment = import.meta.env.DEV;
    const endpoint = isDevelopment
      ? '/api/tefas/api/DB/BindHistoryInfo'
      : 'https://www.tefas.gov.tr/api/DB/BindHistoryInfo';

    const today = dayjs();
    let startDate = dayjs();

    switch (range) {
      case '1w': startDate = today.subtract(7, 'days'); break;
      case '1mo': startDate = today.subtract(1, 'month'); break;
      case '3mo': startDate = today.subtract(3, 'months'); break;
    }

    const formData = new URLSearchParams();
    formData.append('fontip', 'YAT');
    formData.append('bastarih', startDate.format('DD.MM.YYYY'));
    formData.append('bittarih', today.format('DD.MM.YYYY'));
    formData.append('fonkod', fundCode);

    try {
      const response = USE_MOCK_API
        ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
        : await axios.post<TefasApiResponse>(endpoint, formData, {
            headers: {
              Accept: 'application/json, text/javascript, */*; q=0.01',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 20000, // extend timeout for larger data
          });

      const items = response.data?.data;
      if (!items || items.length === 0) return [];

      // Sort old to new for charting
      items.sort((a: FundHistoryItem, b: FundHistoryItem) => parseInt(a.TARIH) - parseInt(b.TARIH)); 

      return items.map((item: FundHistoryItem) => ({
        date: new Date(parseInt(item.TARIH)).toISOString().split('T')[0],
        price: item.FIYAT,
      }));
    } catch (error) {
      console.error(`TEFAS API historical data error for ${fundCode}:`, error);
      throw new Error('TEFAS historical data could not be fetched.');
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.requestHistory.clear();
    this.pendingRequests.clear();
    console.log('🧹 TEFAS cache and history cleared');
  }

  // Cache istatistikleri
  getCacheStats(): { totalCached: number; validCached: number; pendingRequests: number } {
    const validCached = Array.from(this.cache.values()).filter(
      item => this.isCacheValid(item.timestamp)
    ).length;

    return {
      totalCached: this.cache.size,
      validCached,
      pendingRequests: this.pendingRequests.size,
    };
  }


}

export const tefasService = TefasService.getInstance(); 