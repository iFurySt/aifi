import { createContext } from "react";
import type { StockLogoRepository } from "@aifi/core";
export const FundLogoContext = createContext<Pick<
  StockLogoRepository,
  "get" | "peek"
> | null>(null);
