import { Skeleton, SkeletonRows } from "./Skeleton";
import {
  stockDisplayName,
  stockQuotePresentation,
  type StockResearch,
} from "@aifi/core";
import { useDirectoryEntry } from "../stock-directory-context";
import { useStockResearch } from "../stock-research-context";
import { money, percent, useWorkspace } from "../workspace-context";
import { StockAvatar } from "./StockAvatar";
import { ResearchSource } from "./ResearchSource";

function PeerRow({ symbol }: { symbol: string }) {
  const identity = useDirectoryEntry(symbol);
  const { data, loading } = useStockResearch(symbol);
  const { openStock } = useWorkspace();
  const quote = stockQuotePresentation(data);
  const entry = identity.data.item;
  // Only resolve exact US-directory symbols; do not guess foreign/share mappings.
  if (!entry)
    return identity.loading ? (
      <SkeletonRows label="Loading related company" rows={1} avatar />
    ) : null;
  return (
    <button
      className="stock-peer-row"
      aria-busy={loading}
      onClick={() => openStock(symbol, "chart")}
    >
      <StockAvatar symbol={symbol} />
      <span className="stock-peer-name">
        <strong>{symbol}</strong>
        <small>
          {stockDisplayName(
            data.datasets.profile?.data.profile?.name,
            entry.name,
            symbol,
          )}
        </small>
      </span>
      <span className="stock-peer-price" title={quote.asOf ?? quote.date}>
        <strong>
          {loading ? (
            <Skeleton width={52} />
          ) : quote.price === undefined ? (
            "—"
          ) : (
            money(quote.price)
          )}
        </strong>
        <small
          className={
            quote.changePercent === undefined
              ? ""
              : quote.changePercent >= 0
                ? "positive"
                : "negative"
          }
        >
          {quote.changePercent === undefined
            ? ""
            : percent(quote.changePercent)}
        </small>
      </span>
    </button>
  );
}
export function StockPeers({ data }: { data: StockResearch }) {
  const view = data.datasets.peers;
  const symbols = [
    ...new Set(
      (view?.data.records ?? [])
        .filter(
          (r) =>
            r.recordKind === "related-stock" && typeof r.symbol === "string",
        )
        .map((r) => String(r.symbol)),
    ),
  ].slice(0, 5);
  return (
    <section className="stock-peers">
      <h2>Peers</h2>
      {symbols.length ? (
        <div className="stock-peer-list">
          {symbols.map((symbol) => (
            <PeerRow key={symbol} symbol={symbol} />
          ))}
        </div>
      ) : (
        <div className="stock-no-data">
          {view ? "No related stocks reported" : "Not collected yet"}
        </div>
      )}
      <ResearchSource view={view} />
    </section>
  );
}
