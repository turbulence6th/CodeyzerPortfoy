import type { PriceData } from '../models/types';

// Mock fiyat verileri (development için)
const mockPrices: Record<string, PriceData> = {
  'USDTRY=X': {
    symbol: 'USDTRY=X',
    price: 34.25,
    change: 0.15,
    changePercent: 0.44,
    lastUpdate: new Date().toISOString(),
  },
  'EURTRY=X': {
    symbol: 'EURTRY=X',
    price: 37.80,
    change: -0.25,
    changePercent: -0.66,
    lastUpdate: new Date().toISOString(),
  },
  'GAUTRY=X': {
    symbol: 'GAUTRY=X',
    price: 2650.50,
    change: 12.30,
    changePercent: 0.47,
    lastUpdate: new Date().toISOString(),
  },
  'XAGTRY=X': {
    symbol: 'XAGTRY=X',
    price: 31.85,
    change: -0.42,
    changePercent: -1.30,
    lastUpdate: new Date().toISOString(),
  },
  'ISCTR.IS': {
    symbol: 'ISCTR.IS',
    price: 1.85,
    change: 0.05,
    changePercent: 2.78,
    lastUpdate: new Date().toISOString(),
  },
  'THYAO.IS': {
    symbol: 'THYAO.IS',
    price: 285.50,
    change: -3.25,
    changePercent: -1.13,
    lastUpdate: new Date().toISOString(),
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

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async fetchPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    console.log('🔄 Mock API: Fetching prices for:', symbols);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const prices: Record<string, PriceData> = {};

    for (const symbol of symbols) {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && this.isCacheValid(cached.timestamp)) {
        prices[symbol] = cached.data;
        continue;
      }

      // Get mock data or generate random data
      const basePrice = mockPrices[symbol];
      if (basePrice) {
        // Add some random variation to simulate real data
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const newPrice = basePrice.price * (1 + variation);
        const change = newPrice - basePrice.price;
        const changePercent = (change / basePrice.price) * 100;

        const priceData: PriceData = {
          symbol: symbol,
          price: Number(newPrice.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          lastUpdate: new Date().toISOString(),
        };

        prices[symbol] = priceData;
        
        // Cache the data
        this.cache.set(symbol, {
          data: priceData,
          timestamp: Date.now(),
        });
      } else {
        // Generate random data for unknown symbols
        const randomPrice = Math.random() * 100 + 10;
        const randomChange = (Math.random() - 0.5) * 4;
        const randomChangePercent = (randomChange / randomPrice) * 100;

        const priceData: PriceData = {
          symbol: symbol,
          price: Number(randomPrice.toFixed(2)),
          change: Number(randomChange.toFixed(2)),
          changePercent: Number(randomChangePercent.toFixed(2)),
          lastUpdate: new Date().toISOString(),
        };

        prices[symbol] = priceData;
        
        this.cache.set(symbol, {
          data: priceData,
          timestamp: Date.now(),
        });
      }
    }

    console.log('✅ Mock API: Prices fetched successfully:', Object.keys(prices));
    return prices;
  }

  // Same symbol transformation as real service
  static transformSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'USDTRY': 'USDTRY=X',
      'EURTRY': 'EURTRY=X', 
      'GAUTRY': 'GAUTRY=X',
      'XAGTRY': 'XAGTRY=X',
    };

    return symbolMap[symbol] || symbol;
  }

  static getBISTSymbol(code: string): string {
    return `${code}.IS`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const mockPriceService = MockPriceService.getInstance(); 