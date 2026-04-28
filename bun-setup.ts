import { GlobalWindow } from "happy-dom";

// Create and register happy-dom globals before tests run
const globalWindow = new GlobalWindow();

// Copy all window properties to globalThis
globalThis.window = globalWindow as unknown as Window & typeof globalThis;
globalThis.document = globalWindow.document as unknown as Document;
globalThis.navigator = globalWindow.navigator as unknown as Navigator;
globalThis.location = globalWindow.location as unknown as Location;
globalThis.localStorage = globalWindow.localStorage;
globalThis.sessionStorage = globalWindow.sessionStorage;
globalThis.crypto = globalWindow.crypto as unknown as Crypto;

// Set up global constants needed by the codebase
(globalThis as unknown as Record<string, string>).CHANNEL_NAME = "wellmet-channel";
(globalThis as unknown as Record<string, string>).EVENT_COLLECTION_URL = "/api/events";
(globalThis as unknown as Record<string, string>).HEATMAP_COLLECTION_URL = "/api/heatmaps";
