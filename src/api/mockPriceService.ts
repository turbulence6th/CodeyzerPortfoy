import type { PriceData, HistoricalPrice, AssetType } from '../models/types';
import { PriceService } from './priceService'; // Gerçek servisten transformSymbol'u almak için

// Hata döndürmesi istenen sembol
const ERROR_SYMBOL = 'EURTRY';

// Mock fiyat verileri (development için)
const mockPrices: Record<string, PriceData> = {
  'USDTRY': {
    symbol: 'USDTRY',
    price: 34.25,
    change: 0.15,
    changePercent: 0.44,
    lastUpdate: new Date().toISOString(),
    name: 'Dolar / Türk Lirası',
  },
  'GAUTRY': {
    symbol: 'GAUTRY',
    price: 2650.50,
    change: 12.30,
    changePercent: 0.47,
    lastUpdate: new Date().toISOString(),
    name: 'Gram Altın',
  },
  'ISCTR.IS': {
    symbol: 'ISCTR.IS',
    price: 1.85,
    change: 0.05,
    changePercent: 2.78,
    lastUpdate: new Date().toISOString(),
    name: 'İş Bankası C',
  },
  'THYAO.IS': {
    symbol: 'THYAO.IS',
    price: 285.50,
    change: -3.25,
    changePercent: -1.13,
    lastUpdate: new Date().toISOString(),
    name: 'Türk Hava Yolları',
  },
  'TCELL.IS': {
    symbol: 'TCELL.IS',
    price: 95.70,
    change: 1.20,
    changePercent: 1.27,
    lastUpdate: new Date().toISOString(),
    name: 'Turkcell',
  },
};

export class MockPriceService {
  private static instance: MockPriceService;
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 dakika

  static getInstance(): MockPriceService {
    if (!MockPriceService.instance) {
      MockPriceService.instance = new MockPriceService();
    }
    return MockPriceService.instance;
  }

  // --- Gerçek PriceService'ten kopyalanan önbellekleme mantığı ---
  private getAssetTypeFromSymbol(symbol: string): AssetType {
    if (symbol.length === 3 && symbol.toUpperCase() === symbol && !['GAU', 'XAG'].includes(symbol)) {
      return 'FUND';
    }
    if (PriceService.transformSymbol(symbol).endsWith('.IS')) {
      return 'STOCK';
    }
    if (['USDTRY', 'EURTRY', 'XAGTRY'].includes(symbol)) {
      return 'CURRENCY';
    }
    if (['GAU', 'GAUTRY', 'XAUUSD'].includes(symbol)) {
      return 'COMMODITY';
    }
    return 'CURRENCY';
  }

  private isCacheValid(symbol: string, timestamp: number, isRefresh = false): boolean {
    const assetType = this.getAssetTypeFromSymbol(symbol);
    const now = new Date();
    const cacheDate = new Date(timestamp);

    if (isRefresh) {
      if (assetType === 'CURRENCY' || assetType === 'COMMODITY') {
        return false; 
      }
      if (assetType === 'STOCK') {
        const day = now.getUTCDay();
        const utcHour = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const isMarketHours = day > 0 && day < 6 && ((utcHour >= 7 && utcHour < 15) || (utcHour === 15 && utcMinutes <= 10));
        if (isMarketHours) {
          return false;
        }
      }
    }

    switch (assetType) {
      case 'FUND':
        return now.toDateString() === cacheDate.toDateString();
      case 'STOCK': {
        const day = now.getUTCDay();
        const utcHour = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const isMarketHours = day > 0 && day < 6 && ((utcHour >= 7 && utcHour < 15) || (utcHour === 15 && utcMinutes <= 10));
        if (isMarketHours) {
          return now.getTime() - timestamp < this.CACHE_DURATION;
        } else {
          return now.toDateString() === cacheDate.toDateString();
        }
      }
      case 'CURRENCY':
      case 'COMMODITY':
      default:
        return now.getTime() - timestamp < this.CACHE_DURATION;
    }
  }

  // --- Güncellenmiş fetchSinglePrice metodu ---
  async fetchSinglePrice(symbol: string, isRefresh = false): Promise<PriceData> {
    const cached = this.cache.get(symbol);
    if (cached && this.isCacheValid(symbol, cached.timestamp, isRefresh)) {
      console.log(`🔄 [Cache] Mock API: Using valid cache for ${symbol}.`);
      return { ...cached.data, source: 'cache' };
    }

    console.log(`🔄 [API] Mock API: Fetching single price for: ${symbol}`);
    
    // API gecikmesini simüle et
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    // Veriyi üret veya bul
    let generatedData: PriceData;

    if (symbol === 'AFA') {
      console.log(`[Test] Mock API: Returning zero price for AFA fund.`);
      const previousPrice = 15.75;
      generatedData = {
        symbol: 'AFA',
        price: 0,
        previousClose: previousPrice,
        change: -previousPrice,
        changePercent: -100,
        lastUpdate: new Date().toISOString(),
        name: 'Ak Portföy Alternatif Enerji Hisse Senedi Fonu',
        source: 'api',
      };
      // AFA için sıfır fiyat cache'lenmemeli
      return generatedData;
    }
    
    if (symbol === ERROR_SYMBOL) {
      console.error(`❌ Mock API: Simulating error for ${symbol}`);
      generatedData = {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        lastUpdate: new Date().toISOString(),
        error: `Mock hata: ${symbol} fiyatı alınamadı.`,
        source: 'api',
      };
      this.cache.set(symbol, { data: generatedData, timestamp: Date.now() });
      return generatedData;
    }
    
    const transformedSymbol = PriceService.transformSymbol(symbol);
    const priceData = mockPrices[transformedSymbol] ?? mockPrices[symbol];

    if (priceData) {
      const variation = (Math.random() - 0.5) * 0.02;
      const newPrice = priceData.price * (1 + variation);
      const change = newPrice - (priceData.previousClose ?? priceData.price);

      generatedData = {
        ...priceData,
        price: Number(newPrice.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePercent: Number(((change / (priceData.previousClose ?? priceData.price)) * 100).toFixed(2)),
        lastUpdate: new Date().toISOString(),
        source: 'api',
      };
    } else {
      console.warn(`⚠️ Mock API: No mock data for ${symbol}. Generating random data.`);
      const randomPrice = Math.random() * 3000;
      const randomChange = (Math.random() - 0.5) * 100;
      generatedData = {
        symbol,
        price: Number(randomPrice.toFixed(4)),
        change: Number(randomChange.toFixed(4)),
        changePercent: Number(((randomChange / randomPrice) * 100).toFixed(2)),
        lastUpdate: new Date().toISOString(),
        name: `${symbol} (Mocked)`,
        source: 'api',
      };
    }
    
    this.cache.set(symbol, { data: generatedData, timestamp: Date.now() });
    return generatedData;
  }
  
  // Historical data için mock
  async fetchHistoricalPrices(symbol: string): Promise<HistoricalPrice[]> {
    console.log(`📈 Mock API: Fetching historical data for: ${symbol}`);
    const data: HistoricalPrice[] = [];
    let price = Math.random() * 1000;
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      price *= 1 + (Math.random() - 0.5) * 0.1;
      data.push({
        date: date.toISOString().split('T')[0],
        price: Number(price.toFixed(4)),
      });
    }
    return data;
  }


  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Mock Price Service: Cache cleared.');
  }
}

export const mockPriceService = MockPriceService.getInstance(); 