package market

import "time"

// The source session end handles early closes. The next weekday check is a
// polling schedule, not an exchange holiday calendar or live quote guarantee.
func NextPriceRefresh(now time.Time, hours int, quote *MarketQuote) time.Time {
	next := now.Add(time.Duration(hours) * time.Hour)
	if hours > 24 {
		return next
	}
	if quote != nil && quote.SessionEnd > 0 {
		close := time.Unix(quote.SessionEnd, 0).Add(10 * time.Minute)
		if close.After(now) && close.Before(next) {
			return close
		}
	}
	loc, err := time.LoadLocation("America/New_York")
	if err != nil {
		return next
	}
	local := now.In(loc)
	for i := 0; i < 8; i++ {
		date := local.AddDate(0, 0, i)
		if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
			continue
		}
		close := time.Date(date.Year(), date.Month(), date.Day(), 16, 10, 0, 0, loc)
		if close.After(now) {
			if close.Before(next) {
				return close
			}
			break
		}
	}
	return next
}
