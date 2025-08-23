import { describe, it, expect } from 'vitest';
import { TefasService } from './tefasService';
import type { PriceData } from '../models/types';
import type { FundHistoryItem } from './tefasService'; // Gerçek tip import edildi

describe('TefasService.processFundHistory', () => {

  const createMockHistoryItem = (date: string, price: number, code = 'AFA', name = 'Test Fonu'): FundHistoryItem => ({
    TARIH: new Date(date).getTime().toString(),
    FIYAT: price,
    FONKODU: code,
    FONUNVAN: name,
    TEDPAYSAYISI: 0,
    KISISAYISI: 0,
    PORTFOYBUYUKLUK: 0,
    BORSABULTENFIYAT: '',
  });
  
  const today = '2023-08-23';
  const yesterday = '2023-08-22';
  const twoDaysAgo = '2023-08-21';

  it('should return null for empty or null history', () => {
    expect(TefasService.processFundHistory([], 'AFA')).toBeNull();
    // @ts-expect-error testing invalid input
    expect(TefasService.processFundHistory(null, 'AFA')).toBeNull();
  });

  it('should process a normal history with a valid today price', () => {
    const history = [
      createMockHistoryItem(yesterday, 1.2),
      createMockHistoryItem(today, 1.25),
      createMockHistoryItem(twoDaysAgo, 1.1),
    ];
    const result = TefasService.processFundHistory(history, 'AFA') as PriceData;
    expect(result).not.toBeNull();
    expect(result.price).toBe(1.25);
    expect(result.previousClose).toBe(1.2);
    expect(result.priceDate).toBe(today);
    expect(result.change).toBeCloseTo(0.05);
  });

  it('should use yesterday price if today price is 0', () => {
    const history = [
      createMockHistoryItem(yesterday, 1.2),
      createMockHistoryItem(today, 0),
      createMockHistoryItem(twoDaysAgo, 1.1),
    ];
    const result = TefasService.processFundHistory(history, 'AFA') as PriceData;
    expect(result).not.toBeNull();
    expect(result.price).toBe(1.2);
    expect(result.previousClose).toBe(1.1);
    expect(result.priceDate).toBe(yesterday);
    expect(result.change).toBeCloseTo(0.1);
  });

  it('should use yesterday price if today data is missing', () => {
    const history = [
      createMockHistoryItem(yesterday, 1.2),
      createMockHistoryItem(twoDaysAgo, 1.1),
    ];
    const result = TefasService.processFundHistory(history, 'AFA') as PriceData;
    expect(result).not.toBeNull();
    expect(result.price).toBe(1.2);
    expect(result.previousClose).toBe(1.1);
    expect(result.priceDate).toBe(yesterday);
  });

  it('should handle history with only one entry', () => {
    const history = [createMockHistoryItem(today, 1.25)];
    const result = TefasService.processFundHistory(history, 'AFA') as PriceData;
    expect(result).not.toBeNull();
    expect(result.price).toBe(1.25);
    expect(result.previousClose).toBeUndefined();
    expect(result.change).toBe(0);
    expect(result.priceDate).toBe(today);
  });
});
