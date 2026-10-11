import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { coachMiddleware } from "../server/coach.mjs";
const listen = async server => { server.listen(0, "127.0.0.1"); await once(server, "listening"); return `http://127.0.0.1:${server.address().port}`; };
let providerCalls = 0;
const provider = createServer(async (req, res) => { providerCalls++; assert.equal(req.headers.authorization, "Bearer test-server-key"); let body = ""; for await (const chunk of req) body += chunk; assert.equal(JSON.parse(body).messages[0].content, "15 minutes please"); res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ content: "Review this shorter workout.", plan: { duration: 15, exerciseIds: ["squat", "plank"] } })); });
const providerUrl = await listen(provider);
const connected = createServer(coachMiddleware({ COACH_SERVICE_URL: providerUrl, COACH_SERVICE_KEY: "test-server-key" })); const url = await listen(connected);
const offline = createServer(coachMiddleware({})); const offlineUrl = await listen(offline);
try {
  assert.equal((await (await fetch(`${offlineUrl}/api/coach/status`)).json()).available, false);
  assert.equal((await fetch(`${offlineUrl}/api/coach`, { method: "POST" })).status, 503);
  assert.equal((await (await fetch(`${url}/api/coach/status`)).json()).available, true);
  assert.equal((await fetch(`${url}/api/coach`, { method: "POST", headers: { Origin: "https://untrusted.example" }, body: "{}" })).status, 403);
  assert.equal((await fetch(`${url}/api/coach`, { method: "POST", body: "{}" })).status, 400);
  const response = await fetch(`${url}/api/coach`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "15 minutes please" }], context: { source: "train" }, exerciseIds: ["squat", "plank"] }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).plan.duration, 15); assert.equal(providerCalls, 1); console.log("PASS: configured/offline coaching adapter, origin and input validation, provider forwarding, server-only credential");
} finally { await Promise.all([new Promise(resolve => connected.close(resolve)), new Promise(resolve => provider.close(resolve)), new Promise(resolve => offline.close(resolve))]); }
