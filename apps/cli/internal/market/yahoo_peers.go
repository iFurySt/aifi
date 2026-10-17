package market

import (
	"context"
	"net/url"
)

// Yahoo recommendations are related securities, not a verified competitor taxonomy.
func (c *Client) yahooPeers(ctx context.Context, j Job, r *Result) error {
	symbol, err := yahooTicker(j.Subject)
	if err != nil {
		return err
	}
	raw, err := c.get(ctx, "yahoo", "https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/"+url.PathEscape(symbol), &r.Evidence)
	if err != nil {
		return err
	}
	var root map[string]any
	if err = decodeJSON(raw, &root); err != nil {
		return err
	}
	finance := object(root["finance"])
	rows := array(finance["result"])
	if finance["error"] != nil || len(rows) != 1 || text(object(rows[0])["symbol"]) != symbol {
		return &Failure{Code: "invalid_peer_response"}
	}
	related, ok := object(rows[0])["recommendedSymbols"].([]any)
	if !ok || len(related) > 100 {
		return &Failure{Code: "invalid_peer_response"}
	}
	r.Payload.Records = []Record{}
	seen := map[string]bool{symbol: true}
	for _, item := range related {
		row := object(item)
		peer := text(row["symbol"])
		// Keep exact source tickers. A local directory lookup decides US availability;
		// never guess that a foreign listing or share class is a different US company.
		if !yahooSymbol.MatchString(peer) {
			continue
		}
		score, valid := sourceNumber(row["score"])
		if !valid || score < 0 || score > 1 {
			return &Failure{Code: "invalid_peer_response"}
		}
		if seen[peer] {
			continue
		}
		seen[peer] = true
		r.Payload.Records = append(r.Payload.Records, Record{"symbol": peer, "score": score, "recordKind": "related-stock"})
		if len(r.Payload.Records) >= 10 {
			break
		}
	}
	r.Payload.Complete = false
	r.Payload.Window = "Yahoo related-symbol recommendations; associated stocks, not verified industry peers. Prices and names are independent local snapshots."
	return nil
}
