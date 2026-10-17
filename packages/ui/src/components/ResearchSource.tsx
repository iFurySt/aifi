import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { isResearchSourceURL, type ResearchDatasetView } from "@aifi/core";

export function ResearchSource({
  view,
  detail,
}: {
  view?: ResearchDatasetView;
  detail?: ReactNode;
}) {
  if (!view) return null;
  const providerLabel =
    view.provider === "thirteenf" ? "13F.INFO" : view.provider.toUpperCase();
  const fetched = new Date(view.fetchedAt);
  const sources = [...new Set(view.sources)]
    .filter(isResearchSourceURL)
    .slice(0, 4);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="research-source-chip"
        aria-label={`${providerLabel} source details`}
      >
        {providerLabel}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="research-source-popup"
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          <DropdownMenu.Label className="research-source-heading">
            {providerLabel}
            <span>Source details</span>
          </DropdownMenu.Label>
          <DropdownMenu.Label className="research-source-details">
            <dl>
              <div>
                <dt>Collected</dt>
                <dd>
                  <time dateTime={view.fetchedAt}>
                    {Number.isFinite(fetched.getTime())
                      ? fetched.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Unavailable"}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Coverage</dt>
                <dd>
                  {view.data.complete
                    ? "Complete source window"
                    : "Partial source window"}
                </dd>
              </div>
            </dl>
            {detail}
            {view.data.window && <p>{view.data.window}</p>}
          </DropdownMenu.Label>
          {sources.map((url, i) => (
            <DropdownMenu.Item key={url} asChild>
              <a
                className="research-source-link"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {sources.length > 1 ? `Source ${i + 1}` : "View source"}
                <ExternalLink size={12} />
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
