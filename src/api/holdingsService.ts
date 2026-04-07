import { Capacitor, registerPlugin } from '@capacitor/core';

interface HoldingsPlugin {
  saveHoldings(data: { holdings: HoldingForNative[] }): Promise<{ success: boolean }>;
}

export interface HoldingForNative {
  id: string;
  symbol: string;
  name: string;
  type: string;
  amount: number;
  price: number;
  changePercent: number;
}

const isIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
const HoldingsNative = isIOS ? registerPlugin<HoldingsPlugin>('Holdings') : null;

/**
 * Holdings listesini (fiyatlarıyla birlikte) App Group UserDefaults'a kaydeder.
 * Widget bu veriyi doğrudan okur, kendi başına API çağrısı yapmaz.
 */
export async function saveHoldingsToAppGroup(holdings: HoldingForNative[]): Promise<void> {
  if (!HoldingsNative) return;

  try {
    await HoldingsNative.saveHoldings({ holdings });
  } catch (error) {
    console.error('Holdings App Group\'a kaydedilemedi:', error);
  }
}
