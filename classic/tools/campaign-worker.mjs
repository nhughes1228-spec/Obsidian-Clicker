import { parentPort } from "node:worker_threads";
import { simulateCampaign } from "./campaign-policy.mjs";
parentPort.on("message", (job) => {
  try { parentPort.postMessage({ result: simulateCampaign(job) }); }
  catch (error) { parentPort.postMessage({ error: error.stack, job }); }
});
