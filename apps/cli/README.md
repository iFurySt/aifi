# Planned Local Data Service

The [US stock pipeline design](../../docs/design-docs/us-stock-data-pipeline.md)
now defines the first Go/Cobra capability: local daily data collection, durable
jobs, and cached reads. The [execution plan](../../docs/exec-plans/active/us-stock-data-foundation.md)
stages provider probes, manual sync, scheduling, and Web/Electron integration.

No Go module, binary, provider credentials, or live collector is implemented yet.
