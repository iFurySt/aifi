import type {
  ChatGPTMethod,
  ChatGPTResult,
  ChatGPTStatus,
  ChatGPTModel,
  ChatGPTRequest,
  ChatGPTDelta,
} from "@aifi/core";

export const chatGPTAvailable = () => !!window.aifiDesktop?.requestChatGPT;
export async function requestChatGPT<T>(
  method: ChatGPTMethod,
  params?: unknown,
): Promise<T> {
  if (!window.aifiDesktop?.requestChatGPT)
    throw Error("Open the desktop app to connect ChatGPT.");
  const result = (await window.aifiDesktop.requestChatGPT(
    method,
    params,
  )) as ChatGPTResult<T>;
  if (!result.ok) throw Error(result.error);
  return result.value;
}
export const readChatGPTStatus = () => requestChatGPT<ChatGPTStatus>("status");
export const listChatGPTModels = (profileId: string) =>
  requestChatGPT<ChatGPTModel[]>("models", { profileId });
export async function respondWithChatGPT(
  request: ChatGPTRequest,
  onDelta: (text: string) => void,
) {
  const unsubscribe = window.aifiDesktop?.onChatGPTDelta(
    (event: ChatGPTDelta) => {
      if (event.requestId === request.requestId) onDelta(event.text);
    },
  );
  try {
    return await requestChatGPT<{ text: string }>("respond", request);
  } finally {
    unsubscribe?.();
  }
}
