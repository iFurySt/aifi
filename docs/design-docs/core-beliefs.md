# Core Beliefs

These beliefs shape the repository before product-specific rules exist.

## Agent-First Operating Principles

- Humans steer; agents execute.
- Repository-local knowledge beats private human context.
- The right fix for repeated agent failure is usually better scaffolding, not more prompt pressure.
- Short stable entry points are better than large unstable instruction dumps.
- Mechanical checks are preferred over soft conventions whenever feasible.
- Throughput matters, but unmanaged entropy compounds quickly; keep cleanup and simplification continuous.

## Local-First Data

Collected structured data is acquired asynchronously and persisted in SQLite
before pages/research consumers read it. Opening, searching or paging a view must
not recollect a provider dataset. Keep last-good committed data usable offline;
local IPC/loopback reads are allowed. Follow the
[local data contract](local-data-contract.md) for all future collectors and cloud
synchronization sources.
