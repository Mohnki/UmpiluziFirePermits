import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { buildApp } from "./app";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

const app = buildApp();

export const api = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 60,
    cpu: 1,
    concurrency: 80,
    invoker: "public",
  },
  app
);
