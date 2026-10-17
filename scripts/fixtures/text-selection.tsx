// Reuse offline research fixtures and discover implemented pages at build time.
import { workspacePages } from "@aifi/core";
import "./stocks-responsive";
Object.assign(window, { selectionPages: workspacePages });
