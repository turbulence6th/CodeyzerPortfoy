import type { Holding, PriceData } from '../models/types';

export function getEffectivePrice(priceData?: PriceData): number | undefined {
  if (!priceData) return undefined;
  if (priceData.price === 0 && priceData.previousClose) return priceData.previousClose;
  return priceData.price;
}

export function isInBuyZone(holding: Holding, priceData?: PriceData): boolean {
  const p = getEffectivePrice(priceData);
  return (
    holding.buyTargetMin != null &&
    holding.buyTargetMax != null &&
    p != null &&
    p >= holding.buyTargetMin &&
    p <= holding.buyTargetMax
  );
}
