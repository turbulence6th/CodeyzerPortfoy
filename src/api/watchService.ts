/**
 * Apple Watch ile iletişim servisi
 * Holdings listesini Watch'a gönderir
 * Watch kendi başına fiyatları çeker ve hesaplar
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Watch Plugin interface
interface WatchPlugin {
  sendHoldings(data: { holdings: WatchHolding[] }): Promise<{ success: boolean }>;
}

export interface WatchHolding {
  id: string;
  symbol: string;
  name: string;
  type: string;
  amount: number;
}

// Plugin'i register et (sadece iOS'ta çalışır)
const isIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

const Watch = isIOS ? registerPlugin<WatchPlugin>('Watch') : null;

/**
 * Holdings listesini Apple Watch'a gönderir
 * Watch bu listeyi alıp kendi başına fiyatları çeker
 */
export async function sendHoldingsToWatch(holdings: WatchHolding[]): Promise<boolean> {
  // Sadece iOS'ta çalışır
  if (!Watch) {
    return false;
  }

  try {
    const result = await Watch.sendHoldings({ holdings });
    return result.success;
  } catch (error) {
    console.error('Watch: Holdings gönderilemedi', error);
    return false;
  }
}

/**
 * Redux state'inden Watch için holdings listesi hazırlar
 */
export function prepareHoldingsForWatch(
  holdings: Array<{
    id: string;
    symbol: string;
    name: string;
    type: string;
    amount: number;
  }>
): WatchHolding[] {
  return holdings.map((holding) => ({
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    type: holding.type,
    amount: holding.amount,
  }));
}
