import type { PriceData, HistoricalPrice } from '../models/types';
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

  static getInstance(): MockPriceService {
    if (!MockPriceService.instance) {
      MockPriceService.instance = new MockPriceService();
    }
    return MockPriceService.instance;
  }
  
  // Tek bir fiyatı mock olarak getir
  async fetchSinglePrice(symbol: string): Promise<PriceData> {
    console.log(`🔄 Mock API: Fetching single price for: ${symbol}`);
    
    // API gecikmesini simüle et
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    // Hata sembolünü kontrol et
    if (symbol === ERROR_SYMBOL) {
      console.error(`❌ Mock API: Simulating error for ${symbol}`);
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        lastUpdate: new Date().toISOString(),
        error: `Mock hata: ${symbol} fiyatı alınamadı.`,
      };
    }
    
    // Sembolü Yahoo Finance formatına dönüştür (varsa)
    const transformedSymbol = PriceService.transformSymbol(symbol);
    const priceData = mockPrices[transformedSymbol] ?? mockPrices[symbol];

    if (priceData) {
      // Gerçek zamanlı gibi görünmesi için küçük bir değişiklik ekle
      const variation = (Math.random() - 0.5) * 0.02; // ±%1
      const newPrice = priceData.price * (1 + variation);
      const change = newPrice - (priceData.previousClose ?? priceData.price);

      return {
        ...priceData,
        price: Number(newPrice.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePercent: Number(((change / (priceData.previousClose ?? priceData.price)) * 100).toFixed(2)),
        lastUpdate: new Date().toISOString(),
      };
    }

    // Bilinmeyen semboller için rastgele veri üret
    console.warn(`⚠️ Mock API: No mock data for ${symbol}. Generating random data.`);
    const randomPrice = Math.random() * 3000;
    const randomChange = (Math.random() - 0.5) * 100;
    return {
      symbol,
      price: Number(randomPrice.toFixed(4)),
      change: Number(randomChange.toFixed(4)),
      changePercent: Number(((randomChange / randomPrice) * 100).toFixed(2)),
      lastUpdate: new Date().toISOString(),
      name: `${symbol} (Mocked)`,
    };
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
    // Mock serviste cache yok, ama arayüzle uyumlu olması için metod duruyor.
    console.log('🗑️ Mock Price Service: Cache clear called (no-op).');
  }
}

export const mockPriceService = MockPriceService.getInstance(); 