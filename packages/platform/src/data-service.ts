import type {
  DataMethod,
  DataStatus,
  DataSettings,
  CredentialProvider,
} from "@aifi/core";
let session: string | undefined;
export async function requestLocalData(
  method: DataMethod,
  params?: unknown,
  retry = true,
): Promise<unknown> {
  if (window.aifiDesktop) return window.aifiDesktop.requestData(method, params);
  if (!session) {
    const response = await fetch("/api/local/session", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("Local data service unavailable.");
    session = (await response.json()).token;
  }
  const response = await fetch("/api/local/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-AIFi-Session": session! },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(method === "stock.logo" ? 70000 : 20000),
  });
  if (response.status === 403 && retry) {
    session = undefined;
    return requestLocalData(method, params, false);
  }
  const value = await response.json();
  if (!response.ok || value.error)
    throw Error(value.error || "Local data request failed.");
  return value.result;
}
export const readDataStatus = () =>
  requestLocalData("status") as Promise<DataStatus>;
export const saveDataSettings = (value: DataSettings) =>
  requestLocalData("settings.save", value) as Promise<DataSettings>;
export const syncDirectory = () =>
  requestLocalData("directory.sync") as Promise<DataStatus>;
export const saveCredentials = (
  provider: CredentialProvider,
  values: Record<string, string>,
) => requestLocalData("credentials.set", { provider, values });
export const removeCredentials = (provider: CredentialProvider) =>
  requestLocalData("credentials.remove", { provider });
