import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Navi worker", () => {
	it("responds on / (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.json()).toEqual({ message: "Navi API is running" });
	});

	it("responds on / (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(await response.json()).toEqual({ message: "Navi API is running" });
	});
});

describe("GET /trains/live", () => {
	const url = "https://example.com/trains/live?north=52.6&west=13.2&south=52.4&east=13.5";

	it("keeps only suburban/subway movements and drops the rest", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(
					JSON.stringify({
						movements: [
							{ location: { latitude: 52.5, longitude: 13.4 }, line: { name: "S9", product: "suburban" }, direction: "Spandau", trip: 1 },
							{ location: { latitude: 52.51, longitude: 13.41 }, line: { name: "U9", product: "subway" }, direction: "Rathaus Steglitz", trip: 2 },
							{ location: { latitude: 52.52, longitude: 13.42 }, line: { name: "M2", product: "tram" }, direction: "Heinersdorf", trip: 3 },
							{ location: { latitude: 52.53, longitude: 13.43 }, line: { name: "RE1", product: "regional" }, direction: "Magdeburg", trip: 4 },
						],
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
			),
		);

		const request = new IncomingRequest(url);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		const body = (await response.json()) as { trains: Array<{ line: string; product: string }> };
		expect(body.trains).toHaveLength(2);
		expect(body.trains.map((t) => t.line).sort()).toEqual(["S9", "U9"]);

		vi.unstubAllGlobals();
	});

	it("degrades to an empty list when the upstream request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("network down");
			}),
		);

		// Different bbox than the test above so this misses the Cache API entry
		// that request populated, instead of returning its cached result.
		const request = new IncomingRequest("https://example.com/trains/live?north=52.7&west=13.0&south=52.3&east=13.6");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ trains: [] });

		vi.unstubAllGlobals();
	});
});

describe("GET /reports/:id/watch", () => {
	it("rejects a connection with no valid access token", async () => {
		const request = new IncomingRequest("https://example.com/reports/some-report/watch", {
			headers: { Upgrade: "websocket" },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
	});

	it("rejects a garbage token before ever reaching the durable object", async () => {
		const request = new IncomingRequest("https://example.com/reports/some-report/watch?token=garbage", {
			headers: { Upgrade: "websocket" },
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
	});
});
