import { describe, it, expect } from 'vitest';
import {
  calculateUnitPriceHkd,
  calculateShippingFee,
  calculateTotalHkd,
  ceilKg,
} from '../src/services/pricing.js';

describe('價格計算', () => {
  it('港幣售價 = 人民幣價格 × 匯率 × 1.1', () => {
    expect(calculateUnitPriceHkd({ priceCny: 100, rate: 1.08 })).toBe(118.8);
  });

  it('四捨五入至小數點後兩位', () => {
    expect(calculateUnitPriceHkd({ priceCny: 99.9, rate: 1.081 })).toBe(118.79);
  });

  it('服務費比例可配置', () => {
    expect(calculateUnitPriceHkd({ priceCny: 100, rate: 1, serviceFeePct: 0.15 })).toBe(115);
  });
});

describe('運費計算', () => {
  it('不足 1kg 按 1kg 收費', () => {
    expect(calculateShippingFee({ weightKg: 0.5 })).toBe(10);
  });

  it('2.3kg 向上取整為 3kg', () => {
    expect(calculateShippingFee({ weightKg: 2.3 })).toBe(30);
  });

  it('恰為整數時不重複計費', () => {
    expect(calculateShippingFee({ weightKg: 3 })).toBe(30);
  });

  it('重量為 0 或負數按 1kg', () => {
    expect(calculateShippingFee({ weightKg: 0 })).toBe(10);
    expect(calculateShippingFee({ weightKg: -2 })).toBe(10);
  });

  it('費率可配置', () => {
    expect(calculateShippingFee({ weightKg: 1.2, shippingRatePerKg: 12 })).toBe(24);
  });
});

describe('總金額計算', () => {
  it('總金額 = 單價×數量 + 運費', () => {
    const r = calculateTotalHkd({ priceCny: 100, rate: 1.08, weightKg: 1, quantity: 2 });
    expect(r.unitPriceHkd).toBe(118.8);
    expect(r.shippingFee).toBe(10);
    expect(r.totalHkd).toBe(247.6);
  });
});

describe('ceilKg', () => {
  it('向上取整到整數公斤', () => {
    expect(ceilKg(1)).toBe(1);
    expect(ceilKg(1.01)).toBe(2);
    expect(ceilKg(0.1)).toBe(1);
  });
});
