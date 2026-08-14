export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function ceilKg(weightKg) {
  const w = Number(weightKg) || 0;
  if (w <= 0) return 1;
  return Math.ceil(w);
}

export function calculateUnitPriceHkd({ priceCny, rate, serviceFeePct = 0.1 }) {
  const p = Number(priceCny) || 0;
  const r = Number(rate) || 0;
  const fee = Number(serviceFeePct) || 0;
  return round2(p * r * (1 + fee));
}

export function calculateShippingFee({ weightKg, shippingRatePerKg = 10 }) {
  return ceilKg(weightKg) * (Number(shippingRatePerKg) || 0);
}

export function calculateTotalHkd({ priceCny, rate, weightKg, quantity = 1, serviceFeePct = 0.1, shippingRatePerKg = 10 }) {
  const qty = Number(quantity) || 1;
  const unit = calculateUnitPriceHkd({ priceCny, rate, serviceFeePct });
  const shipping = calculateShippingFee({ weightKg, shippingRatePerKg });
  return {
    unitPriceHkd: unit,
    shippingFee: shipping,
    totalHkd: round2(unit * qty + shipping),
  };
}
