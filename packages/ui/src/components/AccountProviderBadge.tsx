import chatgptMark from "../assets/providers/openai.svg";
import "./account-provider-badge.css";

// Presentation only: extend this registry when another connection is implemented.
const providers = {
  chatgpt: { label: "Signed in with ChatGPT", mark: chatgptMark },
};

export function AccountProviderBadge({
  provider,
}: {
  provider: keyof typeof providers;
}) {
  const { label, mark } = providers[provider];
  return (
    <span
      className="account-provider-badge"
      role="img"
      aria-label={label}
      title={label}
    >
      <span
        style={{
          maskImage: `url(${JSON.stringify(mark)})`,
          WebkitMaskImage: `url(${JSON.stringify(mark)})`,
        }}
      />
    </span>
  );
}
