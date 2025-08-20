export type AssetType = 'CURRENCY' | 'FUND' | 'STOCK' | 'COMMODITY';

export interface Holding {
  id: string;            // uuid
  type: AssetType;       // Varlık türü
  symbol: string;        // USDTRY, EURTRY, GAUTRY, XAGTRY, ISCTR
  name: string;          // Görünen ad
  amount: number;        // adet / gram
  note?: string;        // opsiyonel not
  createdAt: string;     // Oluşturma tarihi
  updatedAt: string;     // Güncelleme tarihi
}

// Yeni kategori veri tipleri
export interface Category {
  id: string;            // uuid
  name: string;          // Kategori adı (ör. "Altın Yatırımları", "Teknoloji Hisseleri")
  color: string;         // Grafikteki renk (hex kodu)
  holdingIds: string[];  // Bu kategoriye dahil varlık id'leri
  createdAt: string;     // Oluşturma tarihi
  updatedAt: string;     // Güncelleme tarihi
}

export interface CategoryChart {
  id: string;            // uuid
  name: string;          // Grafik adı
  description?: string;  // Grafik açıklaması
  categories: Category[]; // Kategoriler
  createdAt: string;     // Oluşturma tarihi
  updatedAt: string;     // Güncelleme tarihi
}

export interface CategoryChartData {
  name: string;          // Kategori adı
  value: number;         // Toplam değer
  percentage: number;    // Yüzde
  color: string;         // Renk
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
  name?: string;
  historicalData?: HistoricalPrice[]; // Geçmiş veriyi de içerebilir
}

export interface PortfolioState {
  holdings: Holding[];
  prices: Record<string, PriceData>;
  totalValue: number;
  lastUpdate: string | null; // ISO 8601 formatında tarih
  loading: boolean;
  error: string | null;
  /** Hangi sembollerin fiyatının güncellendiğini takip eder */
}

export interface PortfolioSummary {
  totalValue: number;
  totalChangeValue: number;
  totalChangePercent: number;
  assetBreakdown: AssetBreakdown[];
}

export interface AssetBreakdown {
  type: AssetType;
  value: number;
  percentage: number;
  count: number;
}

// API Response Types
export interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  shortName?: string;
  longName?: string;
}

export interface YahooFinanceResponse {
  quoteResponse: {
    result: YahooFinanceQuote[];
    error: any;
  };
}

// Fon için TEFAS tipi
export interface TefasFund {
  code: string;
  name: string;
  price: number;
  date: string;
}

export interface HistoricalPrice {
  date: string; // "YYYY-MM-DD" formatında
  price: number;
} 