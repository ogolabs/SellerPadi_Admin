export interface TierPricingInfo {
  name: string;
  ngn: number;
  usd: number;
  ngnYearly: number;
  usdYearly: number;
  quota: number;
  annualQuota: number;
}

export const TIER_PRICING: Record<string, TierPricingInfo> = {
  free: {
    name: "Free Tier",
    ngn: 0,
    usd: 0,
    ngnYearly: 0,
    usdYearly: 0,
    quota: 100,
    annualQuota: 1200,
  },
  starter_500: {
    name: "Starter 500",
    ngn: 1000,
    usd: 2.01,
    ngnYearly: 11400,
    usdYearly: 22.91,
    quota: 500,
    annualQuota: 6000,
  },
  growth_1000: {
    name: "Growth 1,000",
    ngn: 2000,
    usd: 3.03,
    ngnYearly: 22800,
    usdYearly: 34.54,
    quota: 1000,
    annualQuota: 12000,
  },
  business_2500: {
    name: "Business 2,500",
    ngn: 5000,
    usd: 6.07,
    ngnYearly: 57000,
    usdYearly: 69.2,
    quota: 2500,
    annualQuota: 30000,
  },
  scale_5000: {
    name: "Scale 5,000",
    ngn: 10000,
    usd: 11.14,
    ngnYearly: 114000,
    usdYearly: 127.0,
    quota: 5000,
    annualQuota: 60000,
  },
};

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

