import { createPublicClient, http, fallback, formatEther, formatGwei, type Address } from "viem";
import { electroneum as electroneumMainnet, electroneumTestnet } from "viem/chains";

export { electroneumMainnet, electroneumTestnet };

export function isTestnet(): boolean {
  return process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== "mainnet";
}

export const activeChain = isTestnet() ? electroneumTestnet : electroneumMainnet;
export const activeChainId = activeChain.id;
export const blockExplorerUrl = isTestnet()
  ? "https://testnet-blockexplorer.electroneum.com"
  : "https://blockexplorer.electroneum.com";

export function getBlockExplorerTxUrl(txHash?: string | null): string {
  if (!txHash || !isRealTxHash(txHash)) return blockExplorerUrl;
  return `${blockExplorerUrl}/tx/${txHash}`;
}

export function getBlockExplorerAddressUrl(address?: string | null): string {
  if (!address) return blockExplorerUrl;
  return `${blockExplorerUrl}/address/${address}`;
}

export function isRealTxHash(hash?: string | null): hash is `0x${string}` {
  if (!hash) return false;
  if (hash.startsWith("0xsimulated_") || hash.startsWith("0xtest_")) return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export function getPublicClient() {
  const ankrKey = (process.env.ANKR_API_KEY || "").trim();
  const rpcEndpoints = isTestnet()
    ? [
        ...(ankrKey ? [http(`https://rpc.ankr.com/electroneum_testnet/${ankrKey}`)] : []),
        http("https://rpc.ankr.com/electroneum_testnet"),
        http("https://testnet-rpc.electroneum.com"),
      ]
    : [
        http("https://rpc.electroneum.com"),
      ];

  return createPublicClient({
    chain: activeChain,
    transport: fallback(rpcEndpoints, { retryCount: 3, retryDelay: 500 }),
  });
}

// ---------------------------------------------------------------------------
// Real-time ETN / USD Market Pricing Engine
// ---------------------------------------------------------------------------
let cachedEtnPrice: { price: number; timestamp: number } | null = null;
const ETN_PRICE_CACHE_MS = 5 * 60 * 1000; // 5 minutes cache

export async function getEtnUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedEtnPrice && now - cachedEtnPrice.timestamp < ETN_PRICE_CACHE_MS) {
    return cachedEtnPrice.price;
  }

  // 1. Try CoinGecko public API
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=electroneum&vs_currencies=usd", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = (await res.json()) as { electroneum?: { usd?: number } };
      const price = data.electroneum?.usd;
      if (typeof price === "number" && price > 0) {
        cachedEtnPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch {
    // fall through to secondary source
  }

  // 2. Try CryptoCompare public API
  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=ETN&tsyms=USD", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = (await res.json()) as { USD?: number };
      const price = data.USD;
      if (typeof price === "number" && price > 0) {
        cachedEtnPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch {
    // fall through to fallback
  }

  // 3. Fallback to cached value or conservative baseline (~$0.0022 USD)
  const fallbackPrice = cachedEtnPrice?.price || 0.0022;
  cachedEtnPrice = { price: fallbackPrice, timestamp: now };
  return fallbackPrice;
}

// Export alias for backward compatibility
export const getAvaxUsdPrice = getEtnUsdPrice;

export function formatUsdFee(amount: number): string {
  if (amount <= 0) return "$0.00";
  if (amount < 0.0001) return "< $0.0001";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatEtnFee(amount: number): string {
  if (amount <= 0) return "0.00000";
  if (amount < 0.00001) {
    return amount < 1e-7 ? amount.toExponential(2) : amount.toFixed(6);
  }
  return amount.toFixed(5);
}

// Export alias for backward compatibility
export const formatAvaxFee = formatEtnFee;

export function formatGweiGas(rawGwei: number): string {
  if (rawGwei <= 0) return "0.00";
  if (rawGwei < 0.0001) return rawGwei.toExponential(2);
  if (rawGwei < 0.01) return rawGwei.toFixed(4);
  return rawGwei.toFixed(2);
}

export interface GasFeeMetrics {
  gasPriceGwei: string;
  avgGasUnits: number;
  avgFeeNative: string;
  avgFeeUsd: string;
  receiptFeeNative: string;
  receiptFeeUsd: string;
  shipmentFeeNative: string;
  shipmentFeeUsd: string;
  etnPriceUsd: number;
  avaxPriceUsd: number; // backward compatibility
  currencySymbol: string;
  lastTxActual?: {
    txHash: string;
    gasUsed: number;
    effectiveGasPriceGwei: string;
    actualFeeNative: string;
    actualFeeUsd: string;
  } | null;
}

export interface RelayerStatus {
  address: string;
  balanceEtn: string;
  balanceAvax: string; // backward compatibility
  balanceUsd: string;
  balanceRaw: string;
  isCriticalBalance: boolean;
  isLowBalance: boolean;
  evmNonce: number;
  blockNumber: number;
  rpcLatencyMs: number;
  network: "mainnet" | "testnet";
  explorerUrl: string;
  gasFee: GasFeeMetrics;
}

export async function getRelayerStatus(latestAnchoredTxHash?: string | null): Promise<RelayerStatus> {
  const relayerAddress = (process.env.RELAYER_ADDRESS ||
    "0xED0fa5f6749b398DcD10A1E643cC0aBc3096bEa4") as Address;

  const client = getPublicClient();
  const startTime = Date.now();
  const explorerUrl = blockExplorerUrl;
  const currencySymbol = activeChain.nativeCurrency?.symbol || "ETN";

  try {
    const [balance, evmNonce, blockNumber, rawGasPrice, etnPriceUsd] = await Promise.all([
      client.getBalance({ address: relayerAddress }).catch(() => BigInt(0)),
      client.getTransactionCount({ address: relayerAddress }).catch(() => 0),
      client.getBlockNumber().catch(() => BigInt(0)),
      client.getGasPrice().catch(() => BigInt(2000000000)), // fallback 2 Gwei
      getEtnUsdPrice(),
    ]);

    const rpcLatencyMs = Date.now() - startTime;
    const balanceEtn = formatEther(balance);
    const balanceNum = parseFloat(balanceEtn);
    const balanceUsd = (balanceNum * etnPriceUsd).toFixed(2);

    // Gas reserves: < 5 ETN is critical, < 20 ETN is low reserve warning
    const isCriticalBalance = balanceNum < 5.0;
    const isLowBalance = balanceNum < 20.0;

    // Real-time gas price calculation with adaptive precision
    const rawGasGweiNum = Number(formatGwei(rawGasPrice));
    const gasPriceGwei = formatGweiGas(rawGasGweiNum);

    // Typical EVM gas units: ~75,000 for registerReceipt, ~105,000 for createShipment
    const receiptGasUnits = BigInt(75000);
    const shipmentGasUnits = BigInt(105000);
    const avgGasUnits = 90000;

    const receiptFeeEtnNum = Number(formatEther(rawGasPrice * receiptGasUnits));
    const shipmentFeeEtnNum = Number(formatEther(rawGasPrice * shipmentGasUnits));
    const avgFeeEtnNum = Number(formatEther(rawGasPrice * BigInt(avgGasUnits)));

    const receiptFeeNative = formatEtnFee(receiptFeeEtnNum);
    const shipmentFeeNative = formatEtnFee(shipmentFeeEtnNum);
    const avgFeeNative = formatEtnFee(avgFeeEtnNum);

    const receiptFeeUsd = formatUsdFee(receiptFeeEtnNum * etnPriceUsd);
    const shipmentFeeUsd = formatUsdFee(shipmentFeeEtnNum * etnPriceUsd);
    const avgFeeUsd = formatUsdFee(avgFeeEtnNum * etnPriceUsd);

    let lastTxActual: GasFeeMetrics["lastTxActual"] = null;
    if (latestAnchoredTxHash && isRealTxHash(latestAnchoredTxHash)) {
      try {
        const txReceipt = await client.getTransactionReceipt({ hash: latestAnchoredTxHash });
        if (txReceipt) {
          const effectivePrice = txReceipt.effectiveGasPrice || rawGasPrice;
          const actualFeeEtnNum = Number(formatEther(txReceipt.gasUsed * effectivePrice));
          lastTxActual = {
            txHash: latestAnchoredTxHash,
            gasUsed: Number(txReceipt.gasUsed),
            effectiveGasPriceGwei: formatGweiGas(Number(formatGwei(effectivePrice))),
            actualFeeNative: formatEtnFee(actualFeeEtnNum),
            actualFeeUsd: formatUsdFee(actualFeeEtnNum * etnPriceUsd),
          };
        }
      } catch {
        lastTxActual = null;
      }
    }

    const gasFee: GasFeeMetrics = {
      gasPriceGwei,
      avgGasUnits,
      avgFeeNative,
      avgFeeUsd,
      receiptFeeNative,
      receiptFeeUsd,
      shipmentFeeNative,
      shipmentFeeUsd,
      etnPriceUsd,
      avaxPriceUsd: etnPriceUsd,
      currencySymbol,
      lastTxActual,
    };

    return {
      address: relayerAddress,
      balanceEtn: balanceNum.toFixed(4),
      balanceAvax: balanceNum.toFixed(4), // backward compatibility
      balanceUsd,
      balanceRaw: balance.toString(),
      isCriticalBalance,
      isLowBalance,
      evmNonce,
      blockNumber: Number(blockNumber),
      rpcLatencyMs,
      network: isTestnet() ? "testnet" : "mainnet",
      explorerUrl,
      gasFee,
    };
  } catch {
    const fallbackPrice = 0.0022;
    const fallbackGasFee: GasFeeMetrics = {
      gasPriceGwei: "2.00",
      avgGasUnits: 90000,
      avgFeeNative: "0.00018",
      avgFeeUsd: "< $0.0001",
      receiptFeeNative: "0.00015",
      receiptFeeUsd: "< $0.0001",
      shipmentFeeNative: "0.00021",
      shipmentFeeUsd: "< $0.0001",
      etnPriceUsd: fallbackPrice,
      avaxPriceUsd: fallbackPrice,
      currencySymbol,
      lastTxActual: null,
    };

    return {
      address: relayerAddress,
      balanceEtn: "0.0000",
      balanceAvax: "0.0000",
      balanceUsd: "0.00",
      balanceRaw: "0",
      isCriticalBalance: true,
      isLowBalance: true,
      evmNonce: 0,
      blockNumber: 0,
      rpcLatencyMs: Date.now() - startTime,
      network: isTestnet() ? "testnet" : "mainnet",
      explorerUrl,
      gasFee: fallbackGasFee,
    };
  }
}

// ---------------------------------------------------------------------------
// Hyperlane Stablecoin Tokens on Electroneum Smart Chain (Chain ID: 52014)
// Standard: EvmHypSynthetic (ERC-20 with Hyperlane Warp Route bridging)
// ---------------------------------------------------------------------------

export interface HyperlaneTokenConfig {
  symbol: "USDC" | "USDT";
  name: string;
  address: `0x${string}`;
  decimals: number;
  standard: "EvmHypSynthetic";
  iconUrl: string;
  color: string;
  coingeckoId: string;
  warpRoute: {
    collateralChains: readonly string[];
  };
}

export const HYPERLANE_ELECTRONEUM_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "Hyperlane USD Coin",
    address: "0x3187deAd7A2Bd6770F5Fe81495D1B715926AAe6e",
    decimals: 6,
    standard: "EvmHypSynthetic",
    iconUrl: "/tokens/usdc.svg",
    color: "#2775CA",
    coingeckoId: "usd-coin",
    warpRoute: {
      collateralChains: ["Base", "Ethereum", "Avalanche"],
    },
  },
  USDT: {
    symbol: "USDT",
    name: "Hyperlane Tether USD",
    address: "0x48E722f1458b253c2FB0E573F939318D7Dbd54e7",
    decimals: 6,
    standard: "EvmHypSynthetic",
    iconUrl: "/tokens/usdt.svg",
    color: "#53AE94",
    coingeckoId: "tether",
    warpRoute: {
      collateralChains: ["Ethereum"],
    },
  },
} as const;

export type HyperlaneTokenSymbol = keyof typeof HYPERLANE_ELECTRONEUM_TOKENS;

/**
 * Resolves a Hyperlane token configuration by symbol ("USDC" | "USDT") or contract address.
 */
export function getHyperlaneToken(
  symbolOrAddress?: string | null
): HyperlaneTokenConfig | null {
  if (!symbolOrAddress) return null;
  const clean = symbolOrAddress.trim().toLowerCase();

  if (clean === "usdc" || clean === HYPERLANE_ELECTRONEUM_TOKENS.USDC.address.toLowerCase()) {
    return HYPERLANE_ELECTRONEUM_TOKENS.USDC;
  }
  if (clean === "usdt" || clean === HYPERLANE_ELECTRONEUM_TOKENS.USDT.address.toLowerCase()) {
    return HYPERLANE_ELECTRONEUM_TOKENS.USDT;
  }
  return null;
}

