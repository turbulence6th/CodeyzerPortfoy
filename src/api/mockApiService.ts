// src/api/mockApiService.ts
// import type { PriceData } from '../models/types';
// import { PriceService } from './priceService';

// --- Sahte Veritabanı ---

// TEFAS'ın tarih formatını taklit ediyoruz (milisaniye cinsinden string)
const todayTimestamp = new Date(new Date().setHours(14, 0, 0, 0)).getTime().toString();
const yesterdayTimestamp = new Date(new Date().setDate(new Date().getDate() - 1)).getTime().toString();

const mockFundData: Record<string, any[]> = {
  'AFA': [
    // TEFAS API'si en yeni veriyi önce gönderir
    { FONKODU: 'AFA', FONUNVAN: 'Ak Portföy Alternatif Enerji Fonu', FIYAT: 0, TARIH: todayTimestamp },
    { FONKODU: 'AFA', FONUNVAN: 'Ak Portföy Alternatif Enerji Fonu', FIYAT: 15.75, TARIH: yesterdayTimestamp },
  ],
  'GTZ': [
    { FONKODU: 'GTZ', FONUNVAN: 'Garanti Portföy Temiz Enerji Değişken Fon', FIYAT: 1.2345, TARIH: todayTimestamp },
  ],
};

const mockYahooData: Record<string, any> = {
  'THYAO.IS': {
    meta: { regularMarketPrice: 321.50, previousClose: 320.00, shortName: 'TURK HAVA YOLLARI' },
    timestamp: [Date.now() / 1000],
    indicators: { quote: [{ close: [320.00, 321.50] }] },
  },
  'AKSA.IS': {
    meta: { regularMarketPrice: 110.20, previousClose: 108.90, shortName: 'AKSA AKRILIK' },
    timestamp: [Date.now() / 1000],
    indicators: { quote: [{ close: [108.90, 110.20] }] },
  },
  'GMSTR.IS': {
    meta: { regularMarketPrice: 320.6, previousClose: 47.84, shortName: 'GÜMÜŞ ETF' },
    timestamp: [Date.now() / 1000],
    indicators: { quote: [{ close: [47.84, 320.6] }] },
  },
  'EURTRY=X': {
    meta: { regularMarketPrice: 35.80, previousClose: 35.75, shortName: 'EUR/TRY' },
    timestamp: [Date.now() / 1000],
    indicators: { quote: [{ close: [35.75, 35.80] }] },
  },
  'ECILC.IS': {
    meta: { regularMarketPrice: 69.00, previousClose: 68.40, shortName: 'Eczacibasi Ilac' },
    timestamp: [Date.now() / 1000],
    indicators: { quote: [{ close: [68.40, 69.00] }] },
  },
};

const mockSwissquoteData: Record<string, any> = {
  'XAU/USD': [{
    topo: { platform: 'SwissquoteLtd' },
    spreadProfilePrices: [{ spreadProfile: 'elite', bid: 2300.50, ask: 2301.50 }]
  }]
};

// --- Mock Axios Get Fonksiyonu ---
export const mockAxiosGet = async (url: string): Promise<{ data: any }> => {
  console.log(`[Mock API] Intercepted GET request for: ${url}`);
  
  // Gecikme simülasyonu
  await new Promise(res => setTimeout(res, 200 + Math.random() * 300));

  // TEFAS URL'lerini yakala (Hem dev hem prod ortamıyla uyumlu)
  if (url.includes('/api/DB/BindHistoryInfo')) {
    const fonKodu = url.match(/FonKodu=(.*?)$/)?.[1];
    if (fonKodu && mockFundData[fonKodu]) {
      // tefasService, { data: { data: [...] } } yapısını bekliyor
      return { data: { data: mockFundData[fonKodu] } };
    }
  }

  // Yahoo Finance URL'lerini yakala
  if (url.includes('query1.finance.yahoo.com')) {
    const symbol = url.match(/chart\/(.*?)\?/)?.[1];
    if (symbol && mockYahooData[symbol]) {
      return { data: { chart: { result: [mockYahooData[symbol]] } } };
    }
  }

  // Swissquote URL'lerini yakala
  if (url.includes('forex-data-feed.swissquote.com')) {
    const match = url.match(/instrument\/(.*?)\/(.*?)$/);
    const instrument = match?.[1];
    const currency = match?.[2];
    const key = `${instrument}/${currency}`;
    if (key && mockSwissquoteData[key]) {
      return { data: mockSwissquoteData[key] };
    }
  }

  // Eşleşen URL yoksa hata döndür
  console.error(`[Mock API] No mock data defined for URL: ${url}`);
  throw new Error(`Mock API Error: No data for ${url}`);
};
