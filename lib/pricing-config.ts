export interface TierPricingInfo {
  name: string;
  ngn: number;
  usd: number;
  ngnYearly: number;
  usdYearly: number;
  quota: number;
  annualQuota: number;
}

export const BASE_TIER_MONTHLY: Record<
  string,
  { name: string; ngn: number; usd: number; quota: number; annualQuota: number }
> = {
  free: {
    name: "Free Tier",
    ngn: 0,
    usd: 0,
    quota: 100,
    annualQuota: 1200,
  },
  starter_500: {
    name: "Starter 500",
    ngn: 1000,
    usd: 2.01,
    quota: 500,
    annualQuota: 6000,
  },
  growth_1000: {
    name: "Growth 1,000",
    ngn: 2000,
    usd: 3.03,
    quota: 1000,
    annualQuota: 12000,
  },
  business_2500: {
    name: "Business 2,500",
    ngn: 5000,
    usd: 6.07,
    quota: 2500,
    annualQuota: 30000,
  },
  scale_5000: {
    name: "Scale 5,000",
    ngn: 10000,
    usd: 11.14,
    quota: 5000,
    annualQuota: 60000,
  },
};

export function calculateYearlyPrice(monthlyAmount: number, discountPercent: number = 5): number {
  if (monthlyAmount <= 0) return 0;
  const safeDiscount = Math.max(0, Math.min(50, discountPercent));
  return Math.round(monthlyAmount * 12 * (1 - safeDiscount / 100) * 100) / 100;
}

export function getTierPricing(discountPercent: number = 5): Record<string, TierPricingInfo> {
  const result: Record<string, TierPricingInfo> = {};
  for (const [key, base] of Object.entries(BASE_TIER_MONTHLY)) {
    result[key] = {
      name: base.name,
      ngn: base.ngn,
      usd: base.usd,
      ngnYearly: Math.round(calculateYearlyPrice(base.ngn, discountPercent)),
      usdYearly: calculateYearlyPrice(base.usd, discountPercent),
      quota: base.quota,
      annualQuota: base.annualQuota,
    };
  }
  return result;
}

export const TIER_PRICING: Record<string, TierPricingInfo> = getTierPricing(5);

export const DEFAULT_CURRENCY_MAP: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  GH: "GHS",
  KE: "KES",
  CA: "CAD",
  ZA: "ZAR",
  FR: "EUR",
  DE: "EUR",
  AE: "AED",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
};

