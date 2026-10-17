import { useContext, useEffect, useState } from "react";
import { FundLogoContext } from "../fund-logo-context";
import { peekPreparedStockLogo, prepareStockLogo } from "../stock-logo-image";
export function FundAvatar({
  cik,
  name,
  large = false,
}: {
  cik?: string;
  name: string;
  large?: boolean;
}) {
  const repository = useContext(FundLogoContext);
  const cached = cik ? repository?.peek?.(cik) : null;
  const ready = cached ? peekPreparedStockLogo(cached) : undefined;
  const [image, setImage] = useState<{
    cik?: string;
    url: string;
    light: boolean;
  }>();
  useEffect(() => {
    let active = true;
    if (cik && repository)
      void repository
        .get(cik)
        .then((l) => (l ? prepareStockLogo(l) : null))
        .then((img) => {
          if (active && img) setImage({ cik, url: img.url, light: img.light });
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [cik, repository]);
  const current = image?.cik === cik ? image : undefined;
  const url = current?.url ?? ready?.url;
  return (
    <span
      className={`fund-avatar stock-avatar ${large ? "fund-avatar-large" : ""}`}
      aria-hidden="true"
      data-light-logo={current?.light ?? ready?.light ?? false}
      data-logo-state={url ? "ready" : "unavailable"}
    >
      {url ? <img src={url} alt="" decoding="sync" /> : name[0]?.toUpperCase()}
    </span>
  );
}
