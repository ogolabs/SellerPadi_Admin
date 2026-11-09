import { createPublicClient, http, formatEther, formatGwei, type Address } from "viem";
import { avalanche as avalancheMainnet, avalancheFuji } from "viem/chains";

export { avalancheMainnet, avalancheFuji };

export function isTestnet(): boolean {
  return process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== "mainnet";
}

export const activeChain = isTestnet() ? avalancheFuji : avalancheMainnet;
export const activeChainId = activeChain.id;
export const blockExplorerUrl = activeChain.blockExplorers?.default?.url || (isTestnet() ? "https://testnet.snowtrace.io" : "https://snowtrace.io");

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
  const chain = isTestnet() ? avalancheFuji : avalancheMainnet;
  return createPublicClient({
    chain,
    transport: http(undefined, { timeout: 8000, retryCount: 3, retryDelay: 500 }),
  });
}

// ---------------------------------------------------------------------------
// Real-time AVAX / USD Market Pricing Engine
// ---------------------------------------------------------------------------
let cachedAvaxPrice: { price: number; timestamp: number } | null = null;
const AVAX_PRICE_CACHE_MS = 5 * 60 * 1000; // 5 minutes cache

export async function getAvaxUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedAvaxPrice && now - cachedAvaxPrice.timestamp < AVAX_PRICE_CACHE_MS) {
    return cachedAvaxPrice.price;
  }

  // 1. Try CoinGecko public API
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = (await res.json()) as { "avalanche-2"?: { usd?: number } };
      const price = data["avalanche-2"]?.usd;
      if (typeof price === "number" && price > 0) {
        cachedAvaxPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch {
    // fall through to secondary source
  }

  // 2. Try CryptoCompare public API
  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/price?fsym=AVAX&tsyms=USD", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = (await res.json()) as { USD?: number };
      const price = data.USD;
      if (typeof price === "number" && price > 0) {
        cachedAvaxPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch {
    // fall through to fallback
  }

  // 3. Fallback to cached value or conservative baseline ($25.00 USD)
  const fallback = cachedAvaxPrice?.price || 25.0;
  cachedAvaxPrice = { price: fallback, timestamp: now };
  return fallback;
}

export function formatUsdFee(amount: number): string {
  if (amount <= 0) return "$0.00";
  if (amount < 0.0001) return "< $0.0001";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatAvaxFee(amount: number): string {
  if (amount <= 0) return "0.00000";
  if (amount < 0.00001) {
    return amount < 1e-7 ? amount.toExponential(2) : amount.toFixed(6);
  }
  return amount.toFixed(5);
}

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
  avaxPriceUsd: number;
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
  balanceAvax: string;
  balanceEtn?: string; // Backward compatibility alias
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
  const currencySymbol = activeChain.nativeCurrency?.symbol || "AVAX";

  try {
    const [balance, evmNonce, blockNumber, rawGasPrice, avaxPriceUsd] = await Promise.all([
      client.getBalance({ address: relayerAddress }).catch(() => BigInt(0)),
      client.getTransactionCount({ address: relayerAddress }).catch(() => 0),
      client.getBlockNumber().catch(() => BigInt(0)),
      client.getGasPrice().catch(() => BigInt(25000000000)), // fallback 25 Gwei
      getAvaxUsdPrice(),
    ]);

    const rpcLatencyMs = Date.now() - startTime;
    const balanceAvax = formatEther(balance);
    const balanceNum = parseFloat(balanceAvax);
    const balanceUsd = (balanceNum * avaxPriceUsd).toFixed(2);

    // Gas reserves: < 0.1 is critical, < 0.5 is low reserve warning
    const isCriticalBalance = balanceNum < 0.1;
    const isLowBalance = balanceNum < 0.5;

    // Real-time gas price calculation with adaptive precision
    const rawGasGweiNum = Number(formatGwei(rawGasPrice));
    const gasPriceGwei = formatGweiGas(rawGasGweiNum);

    // Typical EVM gas units: ~75,000 for registerReceipt, ~105,000 for createShipment
    const receiptGasUnits = BigInt(75000);
    const shipmentGasUnits = BigInt(105000);
    const avgGasUnits = 90000;

    const receiptFeeAvaxNum = Number(formatEther(rawGasPrice * receiptGasUnits));
    const shipmentFeeAvaxNum = Number(formatEther(rawGasPrice * shipmentGasUnits));
    const avgFeeAvaxNum = Number(formatEther(rawGasPrice * BigInt(avgGasUnits)));

    const receiptFeeNative = formatAvaxFee(receiptFeeAvaxNum);
    const shipmentFeeNative = formatAvaxFee(shipmentFeeAvaxNum);
    const avgFeeNative = formatAvaxFee(avgFeeAvaxNum);

    const receiptFeeUsd = formatUsdFee(receiptFeeAvaxNum * avaxPriceUsd);
    const shipmentFeeUsd = formatUsdFee(shipmentFeeAvaxNum * avaxPriceUsd);
    const avgFeeUsd = formatUsdFee(avgFeeAvaxNum * avaxPriceUsd);

    let lastTxActual: GasFeeMetrics["lastTxActual"] = null;
    if (latestAnchoredTxHash && isRealTxHash(latestAnchoredTxHash)) {
      try {
        const txReceipt = await client.getTransactionReceipt({ hash: latestAnchoredTxHash });
        if (txReceipt) {
          const effectivePrice = txReceipt.effectiveGasPrice || rawGasPrice;
          const actualFeeAvaxNum = Number(formatEther(txReceipt.gasUsed * effectivePrice));
          lastTxActual = {
            txHash: latestAnchoredTxHash,
            gasUsed: Number(txReceipt.gasUsed),
            effectiveGasPriceGwei: formatGweiGas(Number(formatGwei(effectivePrice))),
            actualFeeNative: formatAvaxFee(actualFeeAvaxNum),
            actualFeeUsd: formatUsdFee(actualFeeAvaxNum * avaxPriceUsd),
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
      avaxPriceUsd,
      currencySymbol,
      lastTxActual,
    };

    return {
      address: relayerAddress,
      balanceAvax: balanceNum.toFixed(4),
      balanceEtn: balanceNum.toFixed(4), // backward compatibility
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
    const fallbackPrice = 25.0;
    const fallbackGasFee: GasFeeMetrics = {
      gasPriceGwei: "25.00",
      avgGasUnits: 90000,
      avgFeeNative: "0.00225",
      avgFeeUsd: "$0.06",
      receiptFeeNative: "0.00188",
      receiptFeeUsd: "$0.05",
      shipmentFeeNative: "0.00263",
      shipmentFeeUsd: "$0.07",
      avaxPriceUsd: fallbackPrice,
      currencySymbol,
      lastTxActual: null,
    };

    return {
      address: relayerAddress,
      balanceAvax: "0.0000",
      balanceEtn: "0.0000",
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
