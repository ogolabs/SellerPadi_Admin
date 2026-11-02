import { createPublicClient, http, formatEther, type Address } from "viem";
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

export interface RelayerStatus {
  address: string;
  balanceAvax: string;
  balanceEtn?: string; // Backward compatibility alias
  balanceRaw: string;
  isCriticalBalance: boolean;
  isLowBalance: boolean;
  evmNonce: number;
  blockNumber: number;
  rpcLatencyMs: number;
  network: "mainnet" | "testnet";
  explorerUrl: string;
}

export async function getRelayerStatus(): Promise<RelayerStatus> {
  const relayerAddress = (process.env.RELAYER_ADDRESS ||
    "0xED0fa5f6749b398DcD10A1E643cC0aBc3096bEa4") as Address;

  const client = getPublicClient();
  const startTime = Date.now();
  const explorerUrl = blockExplorerUrl;

  try {
    const [balance, evmNonce, blockNumber] = await Promise.all([
      client.getBalance({ address: relayerAddress }).catch(() => BigInt(0)),
      client.getTransactionCount({ address: relayerAddress }).catch(() => 0),
      client.getBlockNumber().catch(() => BigInt(0)),
    ]);

    const rpcLatencyMs = Date.now() - startTime;
    const balanceAvax = formatEther(balance);
    const balanceNum = parseFloat(balanceAvax);
    // Avalanche C-Chain gas reserves: < 0.1 AVAX is critical, < 0.5 AVAX is low reserve warning
    const isCriticalBalance = balanceNum < 0.1;
    const isLowBalance = balanceNum < 0.5;

    return {
      address: relayerAddress,
      balanceAvax: balanceNum.toFixed(4),
      balanceEtn: balanceNum.toFixed(4), // backward compatibility
      balanceRaw: balance.toString(),
      isCriticalBalance,
      isLowBalance,
      evmNonce,
      blockNumber: Number(blockNumber),
      rpcLatencyMs,
      network: isTestnet() ? "testnet" : "mainnet",
      explorerUrl,
    };
  } catch {
    return {
      address: relayerAddress,
      balanceAvax: "0.0000",
      balanceEtn: "0.0000",
      balanceRaw: "0",
      isCriticalBalance: true,
      isLowBalance: true,
      evmNonce: 0,
      blockNumber: 0,
      rpcLatencyMs: Date.now() - startTime,
      network: isTestnet() ? "testnet" : "mainnet",
      explorerUrl,
    };
  }
}
