import axios from 'axios';
import dayjs from 'dayjs';
import type { PriceData, HistoricalPrice } from '../models/types';
import { USE_MOCK_API } from '../utils/config';
import { mockAxiosGet } from './mockApiService';

export type FundHistoryItem = {
  fonKodu: string;
  fonUnvan: string;
  kategoriDerece?: number;
  kategoriFonSay?: number;
  tarih: string;
  fiyat: number;
};

type TefasApiResponse = {
  errorCode: string | null;
  errorMessage: string | null;
  resultList?: FundHistoryItem[];
};

// TEFAS yatırım fonu fiyatlarını çeken servis
export class TefasService {
  private static instance: TefasService;
  private pendingRequests: Map<string, Promise<PriceData | null>> = new Map();
  private requestHistory: Map<string, number> = new Map();
  private readonly MIN_REQUEST_INTERVAL = 5000;

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
    if (!this.canMakeRequest(fundCode)) {
      console.log(`TEFAS: Rate limit engelledi (${fundCode})`);
      return null;
    }

    const pending = this.pendingRequests.get(fundCode);
    if (pending) {
      console.log(`TEFAS: Pending request beklemede (${fundCode})`);
      return pending;
    }

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

  public static processFundHistory(history: FundHistoryItem[], fundCode: string): PriceData | null {
    if (!history || history.length === 0) {
      console.warn(`TEFAS: Veri bulunamadı (${fundCode})`);
      return null;
    }

    // Tarihe göre en yeniden en eskiye doğru sırala
    const sortedHistory = [...history].sort((a, b) => b.tarih.localeCompare(a.tarih));

    const latest = sortedHistory[0];
    const previous = sortedHistory.length > 1 ? sortedHistory[1] : null;

    const usePreviousAsLatest = latest.fiyat === 0 && previous;
    const effectiveData = usePreviousAsLatest ? previous! : latest;
    
    const comparisonData = usePreviousAsLatest 
      ? (sortedHistory.length > 2 ? sortedHistory[2] : null)
      : previous;

    const price = effectiveData.fiyat;
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn(`TEFAS: Fiyat geçersiz (${fundCode}):`, price);
      return null;
    }
    
    let change = 0;
    let changePercent = 0;
    let previousClose: number | undefined = undefined;
    
    if (comparisonData && typeof comparisonData.fiyat === 'number' && comparisonData.fiyat > 0) {
      previousClose = comparisonData.fiyat;
      change = price - previousClose;
      changePercent = (change / previousClose) * 100;
    }

    const historicalData: HistoricalPrice[] = sortedHistory
      .map((item: FundHistoryItem) => ({
        date: item.tarih,
        price: item.fiyat,
      }))
      .reverse();

    const priceData: PriceData = {
      symbol: fundCode,
      price,
      change,
      changePercent,
      previousClose,
      lastUpdate: new Date().toISOString(),
      name: effectiveData.fonUnvan,
      historicalData,
      priceDate: effectiveData.tarih,
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
      ? '/api/tefas/api/funds/fonFiyatBilgiGetir'
      : 'https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir';

    const payload = {
      fonKodu: fundCode,
      dil: "TR",
      periyod: 1 // 1 aylık veri (gerekli son verileri ve dünü bulmak için yeterli)
    };

    const response = USE_MOCK_API
      ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
      : await axios.post<TefasApiResponse>(endpoint, payload, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://www.tefas.gov.tr',
            'Referer': `https://www.tefas.gov.tr/tr/fon-detayli-analiz/${fundCode}`
          },
          timeout: 15000,
        });

    const items = response.data?.resultList;
    const priceData = TefasService.processFundHistory(items || [], fundCode);

    return priceData;
  }

  async fetchHistoricalFundPrices(
    fundCode: string,
    range: '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y'
  ): Promise<HistoricalPrice[]> {
    let periyod = 3;
    
    switch (range) {
      case '1w': periyod = 1; break;
      case '1mo': periyod = 1; break;
      case '3mo': periyod = 3; break;
      case '6mo': periyod = 6; break;
      case '1y': periyod = 12; break;
      case '3y': periyod = 36; break;
      case '5y': periyod = 60; break;
      default: periyod = 3;
    }

    try {
      const isDevelopment = import.meta.env.DEV;
      const endpoint = isDevelopment
        ? '/api/tefas/api/funds/fonFiyatBilgiGetir'
        : 'https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir';

      const payload = {
        fonKodu: fundCode,
        dil: "TR",
        periyod: periyod
      };

      const response = USE_MOCK_API
        ? await mockAxiosGet(`${endpoint}?FonKodu=${fundCode}`)
        : await axios.post<TefasApiResponse>(endpoint, payload, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Origin': 'https://www.tefas.gov.tr',
              'Referer': `https://www.tefas.gov.tr/tr/fon-detayli-analiz/${fundCode}`
            },
            timeout: 20000,
          });

      const items = response.data?.resultList;
      if (!items || items.length === 0) return [];

      let allData = items.map((item: FundHistoryItem) => ({
        date: item.tarih,
        price: item.fiyat,
      }));
      
      // Tekrar eden tarihleri kaldır ve sırala
      const uniqueData = new Map<string, HistoricalPrice>();
      allData.forEach((item: HistoricalPrice) => uniqueData.set(item.date, item));

      let result = Array.from(uniqueData.values())
        .filter(item => item.price > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      // 1 hafta istendiyse, periyod=1 aylık geldiğinden son 7 günü filtrele
      if (range === '1w') {
        const today = dayjs();
        const weekAgo = today.subtract(7, 'day').format('YYYY-MM-DD');
        result = result.filter(item => item.date >= weekAgo);
      }

      return result;
    } catch (error) {
      console.error(`TEFAS API historical data error for ${fundCode}:`, error);
      throw new Error('TEFAS historical data could not be fetched.');
    }
  }
}

export const tefasService = TefasService.getInstance();
