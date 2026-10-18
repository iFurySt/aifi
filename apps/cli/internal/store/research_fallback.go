package store

// Nasdaq is an independently attributed, keyless backup for missing Yahoo
// profiles/analyst data. Explicit alternate provider selections stay unchanged.
func (c ResearchConfig) AllowsProvider(provider, dataset string) bool {
	return c.ProviderFor(dataset) == provider || provider == "nasdaq" && c.ProviderFor(dataset) == "yahoo" && (dataset == "profile" || dataset == "analyst")
}
