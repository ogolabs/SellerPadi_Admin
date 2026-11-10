import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { connectAdminDb, AdminSystemConfig, AdminBatchRecord, AdminReceipt } from "@/lib/db";
import {
  getPublicClient,
  getAvaxUsdPrice,
  isRealTxHash,
  getBlockExplorerTxUrl,
  activeChain,
} from "@/lib/chain";
import { formatEther, formatGwei } from "viem";

async function authenticateAdmin(): Promise<{ authorized: boolean; email?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return { authorized: false };

  const session = await verifyAdminSessionToken(token);
  if (!session) return { authorized: false };

  return { authorized: true, email: session.email };
}

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectAdminDb();

    const [config, avaxPriceUsd, rawGasPrice] = await Promise.all([
      AdminSystemConfig.findOne({ key: "batch_config" }).lean(),
      getAvaxUsdPrice().catch(() => 25.0),
      getPublicClient()
        .getGasPrice()
        .catch(() => BigInt(25000000000)),
    ]);

    const symbol = activeChain.nativeCurrency?.symbol || "AVAX";

    // Avalanche C-Chain standard base fee floor is 25 Gwei (25,000,000,000 wei)
    // On Fuji testnet, idle RPC nodes report tiny gasPrice (e.g. 159 wei).
    // For realistic operational cost estimation on Avalanche C-Chain, apply the standard 25 Gwei floor.
    const AVALANCHE_STANDARD_BASE_FEE = BigInt(25_000_000_000);
    const effectiveEstimateGasPrice = rawGasPrice > AVALANCHE_STANDARD_BASE_FEE ? rawGasPrice : AVALANCHE_STANDARD_BASE_FEE;

    // Estimate cost for standard ~68,000 gas Merkle tree anchor
    const estGasUnits = 68000;
    const estFeeAvaxNum = Number(formatEther(BigInt(estGasUnits) * effectiveEstimateGasPrice));
    const estFeeUsdNum = estFeeAvaxNum * avaxPriceUsd;

    const estimatedBatchCost = {
      gasUnits: estGasUnits,
      costNative: `~${estFeeAvaxNum.toFixed(4)} ${symbol}`,
      costUsd: `~$${estFeeUsdNum.toFixed(2)} USD`,
      avaxPriceUsd,
    };

    // Find the latest anchored batch transaction
    let latestTxHash: string | null = null;
    let latestBatchType = "receipt";
    let latestRecordCount = 1;
    let latestAnchoredAt: Date | null = null;

    const latestBatch = await AdminBatchRecord.findOne({
      onChainStatus: "anchored",
      onChainTxHash: { $ne: null },
    })
      .sort({ anchoredAt: -1, createdAt: -1 })
      .lean();

    if (latestBatch?.onChainTxHash && isRealTxHash(latestBatch.onChainTxHash)) {
      latestTxHash = latestBatch.onChainTxHash;
      latestBatchType = latestBatch.batchType;
      latestRecordCount = latestBatch.recordCount || (latestBatch.recordIds?.length || 1);
      latestAnchoredAt = latestBatch.anchoredAt || latestBatch.createdAt;
    } else {
      // Fallback to most recent receipt with onChainTxHash
      const latestReceipt = await AdminReceipt.findOne({
        onChainTxHash: { $ne: null },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (latestReceipt?.onChainTxHash && isRealTxHash(latestReceipt.onChainTxHash)) {
        latestTxHash = latestReceipt.onChainTxHash;
        latestBatchType = "receipt";
        latestRecordCount = 1;
        latestAnchoredAt = latestReceipt.createdAt;
      }
    }

    let lastTxActual: {
      txHash: string;
      batchType: string;
      recordCount: number;
      gasUsed: number;
      effectiveGasPriceGwei: string;
      feeNative: string;
      feeUsd: string;
      mainnetEquivalentUsd?: string;
      mainnetEquivalentNative?: string;
      anchoredAt: string | null;
      explorerUrl: string;
    } | null = null;

    if (latestTxHash && isRealTxHash(latestTxHash)) {
      try {
        const client = getPublicClient();
        const txReceipt = await client.getTransactionReceipt({ hash: latestTxHash });
        if (txReceipt) {
          const effectivePrice = txReceipt.effectiveGasPrice || rawGasPrice;
          const actualFeeAvaxNum = Number(formatEther(txReceipt.gasUsed * effectivePrice));
          const actualFeeUsdNum = actualFeeAvaxNum * avaxPriceUsd;

          // Mainnet baseline equivalent for testnet transactions
          const mainnetFeeAvaxNum = Number(formatEther(txReceipt.gasUsed * AVALANCHE_STANDARD_BASE_FEE));
          const mainnetFeeUsdNum = mainnetFeeAvaxNum * avaxPriceUsd;

          // Format fees safely, handling micro-fees on testnet
          let feeUsd: string;
          let feeNative: string;

          if (actualFeeUsdNum < 0.0001) {
            feeUsd = `< $0.0001 USD`;
          } else if (actualFeeUsdNum < 0.01) {
            feeUsd = `$${actualFeeUsdNum.toFixed(4)} USD`;
          } else {
            feeUsd = `$${actualFeeUsdNum.toFixed(2)} USD`;
          }

          if (actualFeeAvaxNum < 0.00001) {
            feeNative = `< 0.00001 ${symbol}`;
          } else {
            feeNative = `${actualFeeAvaxNum.toFixed(5)} ${symbol}`;
          }

          lastTxActual = {
            txHash: latestTxHash,
            batchType: latestBatchType,
            recordCount: latestRecordCount,
            gasUsed: Number(txReceipt.gasUsed),
            effectiveGasPriceGwei: Number(formatGwei(effectivePrice)).toFixed(2),
            feeNative,
            feeUsd,
            mainnetEquivalentUsd: `$${mainnetFeeUsdNum.toFixed(2)} USD`,
            mainnetEquivalentNative: `${mainnetFeeAvaxNum.toFixed(4)} ${symbol}`,
            anchoredAt: latestAnchoredAt ? new Date(latestAnchoredAt).toISOString() : null,
            explorerUrl: getBlockExplorerTxUrl(latestTxHash),
          };
        }
      } catch (receiptErr) {
        console.warn("[API/batch-config] Could not fetch receipt for latest batch:", receiptErr);
      }
    }

    return NextResponse.json({
      maxWaitMinutes: typeof config?.maxWaitMinutes === "number" ? config.maxWaitMinutes : 30,
      minBatchSize: typeof config?.minBatchSize === "number" ? config.minBatchSize : 5,
      maxBatchSize: typeof config?.maxBatchSize === "number" ? config.maxBatchSize : 100,
      estimatedBatchCost,
      lastTxActual,
      updatedAt: config?.updatedAt || null,
      updatedBy: config?.updatedBy || null,
    });
  } catch (error) {
    console.error("[API/batch-config] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve batch configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateAdmin();
    if (!auth.authorized || !auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: {
      maxWaitMinutes?: number;
      minBatchSize?: number;
      maxBatchSize?: number;
      updatedBy: string;
    } = {
      updatedBy: auth.email,
    };

    if (body.maxWaitMinutes !== undefined) {
      const wait = Number(body.maxWaitMinutes);
      if (isNaN(wait) || !Number.isInteger(wait) || wait < 1 || wait > 1440) {
        return NextResponse.json(
          { error: "Accumulation window must be an integer between 1 and 1440 minutes (24 hours)." },
          { status: 400 }
        );
      }
      updates.maxWaitMinutes = wait;
    }

    if (body.minBatchSize !== undefined) {
      const minSize = Number(body.minBatchSize);
      if (isNaN(minSize) || !Number.isInteger(minSize) || minSize < 1 || minSize > 200) {
        return NextResponse.json(
          { error: "Minimum batch size threshold must be an integer between 1 and 200 records." },
          { status: 400 }
        );
      }
      updates.minBatchSize = minSize;
    }

    if (body.maxBatchSize !== undefined) {
      const maxSize = Number(body.maxBatchSize);
      if (isNaN(maxSize) || !Number.isInteger(maxSize) || maxSize < 1 || maxSize > 200) {
        return NextResponse.json(
          { error: "Maximum batch limit must be an integer between 1 and 200 records." },
          { status: 400 }
        );
      }
      updates.maxBatchSize = maxSize;
    }

    await connectAdminDb();

    const updated = await AdminSystemConfig.findOneAndUpdate(
      { key: "batch_config" },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      maxWaitMinutes: updated?.maxWaitMinutes ?? 30,
      minBatchSize: updated?.minBatchSize ?? 5,
      maxBatchSize: updated?.maxBatchSize ?? 100,
      updatedAt: updated?.updatedAt ?? new Date(),
      updatedBy: updated?.updatedBy ?? auth.email,
    });
  } catch (error) {
    console.error("[API/batch-config] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update batch configuration" },
      { status: 500 }
    );
  }
}
