import { describe, it, expect } from 'vitest';
import { PriceService } from './priceService';

describe('PriceService', () => {

  describe('isStockMarketHours', () => {
    // Not: Tarihler UTC olarak oluşturulmuştur. BIST saatleri UTC 07:00-15:10 arasıdır.

    it('should return true for a time within market hours on a weekday', () => {
      // Çarşamba, 14:00 TRT (11:00 UTC)
      const date = new Date('2023-08-23T11:00:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(true);
    });

    it('should return false for a time before market open on a weekday', () => {
      // Çarşamba, 09:50 TRT (06:50 UTC)
      const date = new Date('2023-08-23T06:50:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(false);
    });

    it('should return false for a time after market close on a weekday', () => {
      // Çarşamba, 18:20 TRT (15:20 UTC)
      const date = new Date('2023-08-23T15:20:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(false);
    });

    it('should return false for a time within market hours on a weekend', () => {
      // Cumartesi, 14:00 TRT (11:00 UTC)
      const date = new Date('2023-08-26T11:00:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(false);
    });

    it('should return true exactly at market open', () => {
      // Pazartesi, 10:00 TRT (07:00 UTC)
      const date = new Date('2023-08-21T07:00:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(true);
    });

    it('should return true exactly at market close', () => {
      // Cuma, 18:10 TRT (15:10 UTC)
      const date = new Date('2023-08-25T15:10:00Z');
      expect(PriceService.isStockMarketHours(date)).toBe(true);
    });
  });


  describe('isFundPriceDateValid', () => {
    it('should return true on a weekday if the price date is today', () => {
      // Bugün Çarşamba, fiyat tarihi de Çarşamba
      const today = new Date('2023-08-23T10:00:00Z'); // Çarşamba
      const priceDate = '2023-08-23';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(true);
    });

    it('should return false on a weekday if the price date is from yesterday', () => {
      // Bugün Çarşamba, fiyat tarihi Salı
      const today = new Date('2023-08-23T10:00:00Z'); // Çarşamba
      const priceDate = '2023-08-22';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(false);
    });

    it('should return true on Saturday if the price date is from Friday', () => {
      // Bugün Cumartesi, fiyat tarihi Cuma
      const today = new Date('2023-08-26T10:00:00Z'); // Cumartesi
      const priceDate = '2023-08-25';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(true);
    });

    it('should return false on Saturday if the price date is from Thursday', () => {
      // Bugün Cumartesi, fiyat tarihi Perşembe
      const today = new Date('2023-08-26T10:00:00Z'); // Cumartesi
      const priceDate = '2023-08-24';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(false);
    });

    it('should return true on Sunday if the price date is from Friday', () => {
      // Bugün Pazar, fiyat tarihi Cuma
      const today = new Date('2023-08-27T10:00:00Z'); // Pazar
      const priceDate = '2023-08-25';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(true);
    });
    
    it('should return false on Monday if the price date is from Friday', () => {
      // Bugün Pazartesi, fiyat tarihi Cuma
      const today = new Date('2023-08-28T10:00:00Z'); // Pazartesi
      const priceDate = '2023-08-25';
      expect(PriceService.isFundPriceDateValid(priceDate, today)).toBe(false);
    });
  });
});
