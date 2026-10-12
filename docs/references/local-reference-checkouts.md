# Local Investment Project Reference Checkouts

Snapshot date: 2026-10-12.

Dexter, OpenBB, and AI Hedge Fund are shallow Git clones under
`.reference-repos/` for future source inspection. The root `.gitignore` excludes
that entire directory. Only this inventory and the surrounding research notes
belong to AIFi's tracked source; upstream Git histories and files remain local.

## Recorded Revisions

| Local checkout | Upstream branch | Snapshot commit |
| --- | --- | --- |
| `.reference-repos/dexter/` | `main` | [`534f6be455523c5926eba72bdaf4f914555be5c9`](https://github.com/virattt/dexter/tree/534f6be455523c5926eba72bdaf4f914555be5c9) |
| `.reference-repos/openbb/` | `develop` | [`ae0268771f761b036996d81bd21522ce79d95415`](https://github.com/openbq-org/OpenBB/tree/ae0268771f761b036996d81bd21522ce79d95415) |
| `.reference-repos/ai-hedge-fund/` | `main` | [`78b779c1389e2d1452dc29606d2c4126d859b964`](https://github.com/virattt/ai-hedge-fund/tree/78b779c1389e2d1452dc29606d2c4126d859b964) |

All three checkouts were clean when recorded. Their upstream files were not
installed or executed. Inspect each checkout's own instructions before working
inside it; those instructions apply to upstream work, not to AIFi's product
decisions.

## License Observations

- Dexter's README declares MIT, but the recorded checkout has no standalone
  root license file. Confirm the applicable permission before incorporating its
  source into AIFi. It can still be inspected as a design reference.
- OpenBB's root `LICENSE` states Apache-2.0. Its current upstream is
  `openbq-org/OpenBB`; the former `OpenBB-finance/OpenBB` URL redirects there.
- AI Hedge Fund includes a root MIT `LICENSE`.

Provider data, hosted services, and third-party dependencies have their own
terms. These source licenses do not supply financial data credentials or grant
account connectivity permissions. Recheck licenses at the revision actually
used by a future implementation.

## Recreate the Directory

From the AIFi repository root, these commands create reference checkouts at the
then-current upstream heads, which may differ from the snapshot above:

```bash
mkdir -p .reference-repos
git clone --depth 1 https://github.com/virattt/dexter.git .reference-repos/dexter
git clone --depth 1 https://github.com/openbq-org/OpenBB.git .reference-repos/openbb
git clone --depth 1 https://github.com/virattt/ai-hedge-fund.git .reference-repos/ai-hedge-fund
```

To inspect an exact recorded revision in an existing clean checkout, substitute
its directory and full commit from the table:

```bash
git -C .reference-repos/dexter fetch --depth 1 origin 534f6be455523c5926eba72bdaf4f914555be5c9
git -C .reference-repos/dexter checkout --detach 534f6be455523c5926eba72bdaf4f914555be5c9
```

Older commits must remain available from the upstream for this fetch to work.
If reference checkouts are refreshed, update the snapshot table and license
observations when those versions inform a new design decision.

Related: [Rallies and open-source research](rallies-open-source-landscape.md) and
[deferred Schwab and Plaid direction](../design-docs/broker-connectivity-direction.md).
