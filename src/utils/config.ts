const isDevelopment = import.meta.env.DEV;

// Environment configuration
export const config = {
  api: {
    // Development'ta Vite proxy ile gerçek API kullan, production'da da aynı şekilde
    useMockService: false, // Artık mock service kullanma
    autoRefreshPrices: true, // Auto-refresh'i etkinleştir
    refreshInterval: 5 * 60 * 1000, // 5 dakika
    cacheTimeout: 60 * 1000, // 1 dakika
  },
  
  // UI Configuration
  ui: {
    enableDebugLogging: isDevelopment,
    theme: 'system' as 'light' | 'dark' | 'system',
  },
  features: {
    enableNotifications: true,
    enablePriceAlerts: false, // Gelecekte eklenebilir
  }
};

// Helper functions
export const debugLog = (...args: any[]) => {
  if (config.ui.enableDebugLogging) {
    console.log('[DEBUG]', ...args);
  }
};

export const logError = (...args: any[]) => {
  if (config.ui.enableDebugLogging) {
    console.error('[ERROR]', ...args);
  }
}; 