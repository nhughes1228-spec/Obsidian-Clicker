import { mkdir, writeFile } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
const seeds = Number(process.argv[2] || 100);
const days = Number(process.argv[3] || 90);
if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 1000 || !Number.isSafeInteger(days) || days < 1 || days > 90) throw new Error("Usage: simulate-campaign.mjs [seeds 1-1000] [days 1-90]");
const reports = [];
const jobs = [];
for (const policy of ["greedy", "lookahead", "inexperienced"]) {
  for (let seed = 1; seed <= seeds; seed++) {
    jobs.push({ seed, policy, days });
  }
}
const workerCount = Math.min(jobs.length, 8, Math.max(1, Math.floor(availableParallelism() / 2)));
console.log(`Simulating ${jobs.length} campaigns with ${workerCount} workers.`);
await Promise.all(Array.from({ length: workerCount }, () => new Promise((resolve, reject) => {
  const worker = new Worker(new URL("./campaign-worker.mjs", import.meta.url));
  worker.on("error", reject);
  const next = () => { const job = jobs.shift(); if (job) worker.postMessage(job); else worker.terminate().then(resolve); };
  worker.on("message", ({ result, error }) => {
    if (error) { worker.terminate(); reject(new Error(error)); return; }
    reports.push(result);
    console.log(JSON.stringify({ completed: reports.length, policy: result.policy, seed: result.seed, ...result.milestones }));
    next();
  });
  next();
})));
reports.sort((a, b) => a.policy.localeCompare(b.policy) || a.seed - b.seed);
const gates = {
  finite: reports.every((item) => item.finite),
  firstRiftWithinTwoDays: reports.every((item) => item.milestones.firstRiftHours <= 48),
  chapterOneReachable: reports.every((item) => item.milestones.chapterOneHours > 0),
  campaign30To90Days: reports.every((item) => item.milestones.chapterThreeHours >= 30 * 24 && item.milestones.chapterThreeHours <= 90 * 24),
  repeatableEndgame: reports.every((item) => item.snapshots.at(-1)?.expeditions >= 100),
  alternativesAvailable: reports.every((item) => item.snapshots.every((snapshot) => Object.values(snapshot.availableActivities).some(Boolean))),
};
await mkdir("output/reliability", { recursive: true });
await writeFile("output/reliability/campaign-report.json", JSON.stringify({ seeds, days, policies: 3, schedule: "Three five-minute visits daily, eight hours between starts; one click/second before the first Rift, then one click/ten seconds while managing automation. Purchasing differs by policy; progression-system choices are shared.", gates, reports }, null, 2));
console.log(JSON.stringify({ gates, report: "output/reliability/campaign-report.json" }));
if (days === 90 && Object.values(gates).some((passed) => !passed)) process.exitCode = 1;
