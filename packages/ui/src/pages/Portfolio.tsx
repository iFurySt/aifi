import { ArrowUpRight, Layers, ShieldCheck } from "lucide-react";
import { samplePositions, sampleQuotes } from "@aifi/core";
import { useWorkspace, money, percent } from "../workspace-context";
import { Button, PageHeading, Tag, TextLink } from "../components/primitives";
export function Portfolio() {
  const { research, navigate } = useWorkspace();
  const rows = samplePositions.map((p) => ({
    ...p,
    name: sampleQuotes[p.symbol]!.name,
    value: sampleQuotes[p.symbol]!.price * p.shares,
    gain: (sampleQuotes[p.symbol]!.price - p.cost) * p.shares,
  }));
  const total = rows.reduce((sum, p) => sum + p.value, 0),
    gain = rows.reduce((sum, p) => sum + p.gain, 0);
  let start = 0;
  return (
    <div className="page-container">
      <PageHeading
        title="See the whole picture."
        description="Understand your positions, the overlap, and what deserves another look."
        action={<Tag>Sample portfolio</Tag>}
      />
      <div className="portfolio-stats">
        <div>
          <span>Illustrative portfolio value</span>
          <strong>{money(total)}</strong>
          <small>4 sample positions · USD</small>
        </div>
        <div>
          <span>Sample unrealized return</span>
          <strong className="positive">+{money(gain)}</strong>
          <small className="positive">
            {percent((gain / (total - gain)) * 100)} from sample cost basis
          </small>
        </div>
        <div>
          <span>Largest sample position</span>
          <strong>MSFT</strong>
          <small>
            {(
              (rows.find((p) => p.symbol === "MSFT")!.value / total) *
              100
            ).toFixed(1)}
            % of sample portfolio
          </small>
        </div>
      </div>
      <div className="portfolio-overview">
        <section className="panel allocation-panel">
          <h2>Allocation at a glance</h2>
          <div className="allocation-content">
            <svg
              className="allocation-chart"
              viewBox="0 0 180 180"
              role="img"
              aria-label="Sample allocation: four technology positions"
            >
              <circle
                cx="90"
                cy="90"
                r="64"
                fill="none"
                stroke="var(--surface-muted)"
                strokeWidth="21"
              />
              {rows.map((p) => {
                const share = p.value / total;
                const offset = start;
                start += share;
                return (
                  <circle
                    key={p.symbol}
                    cx="90"
                    cy="90"
                    r="64"
                    fill="none"
                    stroke={p.color}
                    strokeWidth="21"
                    strokeDasharray={`${share * 402.12 - 3} ${402.12 - share * 402.12 + 3}`}
                    strokeDashoffset={-offset * 402.12}
                    transform="rotate(-90 90 90)"
                  />
                );
              })}
              <text x="90" y="86" textAnchor="middle" className="chart-value">
                4
              </text>
              <text x="90" y="107" textAnchor="middle" className="chart-label">
                positions
              </text>
            </svg>
            <div className="allocation-legend">
              {rows.map((p) => (
                <div key={p.symbol}>
                  <span
                    className="legend-dot"
                    style={{ background: p.color }}
                  />
                  <strong>{p.symbol}</strong>
                  <span>{((p.value / total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel portfolio-note">
          <span className="agent-icon tone-blue">
            <Layers size={21} />
          </span>
          <h2>Different names, shared drivers.</h2>
          <p>
            These sample positions share exposure to technology spending. A
            portfolio review should look beyond the number of companies.
          </p>
          <div className="ticker-tags">
            <Tag>Cloud demand</Tag>
            <Tag>AI infrastructure</Tag>
            <Tag>Consumer spending</Tag>
          </div>
          <TextLink
            onClick={() =>
              research(
                "Review concentration and overlapping technology exposures in a portfolio holding NVDA, MSFT, AAPL, and GOOGL.",
              )
            }
          >
            Explore portfolio exposure
          </TextLink>
        </section>
      </div>
      <div className="section-heading">
        <h2>Sample positions</h2>
        <span className="section-meta">
          Illustrative holdings · not linked to a broker
        </span>
      </div>
      <div className="table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="number">Shares</th>
                <th className="number">Sample value</th>
                <th className="number">Sample return</th>
                <th className="number">Weight</th>
                <th>
                  <span className="sr-only">Research</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.symbol}>
                  <td>
                    <strong>{p.symbol}</strong>
                    <small className="table-subtitle">{p.name}</small>
                  </td>
                  <td className="number">{p.shares}</td>
                  <td className="number">{money(p.value)}</td>
                  <td className="number positive">+{money(p.gain)}</td>
                  <td className="number">
                    {((p.value / total) * 100).toFixed(1)}%
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Research ${p.symbol} position`}
                      onClick={() =>
                        research(
                          `How should I research ${p.symbol} as a portfolio position?`,
                        )
                      }
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="page-footnote">
        <ShieldCheck size={15} />
        Broker access is planned.{" "}
        <button onClick={() => navigate("settings")}>
          View connection roadmap
        </button>
      </div>
    </div>
  );
}
