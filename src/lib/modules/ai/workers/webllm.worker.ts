import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// A handler that forwards messages between the main thread and the engine
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
