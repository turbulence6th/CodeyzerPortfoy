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

  private canMakeRequest(fundCode: string): boolean {
    const lastRequest = this.requestHistory.get(fundCode);
    if (!lastRequest) return true;
    return Date.now() - lastRequest >= this.MIN_REQUEST_INTERVAL;
  }

  private setRequestHistory(fundCode: string): void {
    this.requestHistory.set(fundCode, Date.now());
  }

  async fetchFundPrice(fundCode: string): Promise<PriceData | null> {
    // Rate limiting kontrolü
    if (!this.canMakeRequest(fundCode)) {
      console.log(`TEFAS: Rate limit engelledi (${fundCode})`);
      return null;
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
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeFundRequest(fundCode);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`TEFAS: ${fundCode} deneme ${attempt}/${maxRetries} başarısız:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms...
          const delay = 500 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`TEFAS: ${fundCode} tüm denemeler başarısız`, lastError);
    return null;
  }

  private async executeFundRequest(fundCode: string): Promise<PriceData | null> {
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

    const response = USE_MOCK_API
      ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
      : await axios.post<TefasApiResponse>(endpoint, formData, {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 15000,
        });

    const items = response.data?.data;
    const priceData = TefasService.processFundHistory(items || [], fundCode);

    return priceData;
  }

  async fetchHistoricalFundPrices(
    fundCode: string,
    range: '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y'
  ): Promise<HistoricalPrice[]> {
    const today = dayjs();

    // TEFAS API büyük tarih aralıklarını desteklemiyor
    // Birden fazla sorgu yapıp birleştiriyoruz
    const chunkMonths = 3; // Her sorgu maksimum 3 ay

    // 1w için gün bazında başlangıç tarihi hesapla, diğerleri ay bazında
    let startDate: dayjs.Dayjs;
    let totalMonths: number;

    switch (range) {
      case '1w':
        startDate = today.subtract(7, 'day');
        totalMonths = 0; // Chunking'e girmemesi için
        break;
      case '1mo':
        startDate = today.subtract(1, 'month');
        totalMonths = 1;
        break;
      case '3mo':
        startDate = today.subtract(3, 'month');
        totalMonths = 3;
        break;
      case '6mo': totalMonths = 6; startDate = today.subtract(6, 'month'); break;
      case '1y': totalMonths = 12; startDate = today.subtract(12, 'month'); break;
      case '3y': totalMonths = 36; startDate = today.subtract(36, 'month'); break;
      case '5y': totalMonths = 60; startDate = today.subtract(60, 'month'); break;
      default: totalMonths = 3; startDate = today.subtract(3, 'month');
    }

    try {
      let allData: HistoricalPrice[];

      // 3 ay veya daha az için tek sorgu
      if (totalMonths <= chunkMonths) {
        allData = await this.fetchHistoricalChunk(fundCode, startDate, today);
      } else {
        // Büyük aralıklar için parçalı sorgular
        const chunks: Promise<HistoricalPrice[]>[] = [];
        let endDate = today;

        for (let remaining = totalMonths; remaining > 0; remaining -= chunkMonths) {
          const monthsToFetch = Math.min(remaining, chunkMonths);
          const chunkStart = endDate.subtract(monthsToFetch, 'month');
          chunks.push(this.fetchHistoricalChunk(fundCode, chunkStart, endDate));
          endDate = chunkStart;
        }

        const results = await Promise.all(chunks);
        allData = results.flat();
      }

      // Tekrar eden tarihleri kaldır ve sırala
      const uniqueData = new Map<string, HistoricalPrice>();
      allData.forEach(item => uniqueData.set(item.date, item));

      return Array.from(uniqueData.values())
        .filter(item => item.price > 0) // Sıfır fiyatlı kayıtları çıkar
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error(`TEFAS API historical data error for ${fundCode}:`, error);
      throw new Error('TEFAS historical data could not be fetched.');
    }
  }

  private async fetchHistoricalChunk(
    fundCode: string,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ): Promise<HistoricalPrice[]> {
    const isDevelopment = import.meta.env.DEV;
    const endpoint = isDevelopment
      ? '/api/tefas/api/DB/BindHistoryInfo'
      : 'https://www.tefas.gov.tr/api/DB/BindHistoryInfo';

    const formData = new URLSearchParams();
    formData.append('fontip', 'YAT');
    formData.append('bastarih', startDate.format('DD.MM.YYYY'));
    formData.append('bittarih', endDate.format('DD.MM.YYYY'));
    formData.append('fonkod', fundCode);

    const response = USE_MOCK_API
      ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
      : await axios.post<TefasApiResponse>(endpoint, formData, {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 20000,
        });

    const items = response.data?.data;
    if (!items || items.length === 0) return [];

    return items.map((item: FundHistoryItem) => ({
      date: new Date(parseInt(item.TARIH)).toISOString().split('T')[0],
      price: item.FIYAT,
    }));
  }
}

export const tefasService = TefasService.getInstance();