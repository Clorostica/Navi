export class ReportPresenceDO implements DurableObject {
	constructor(private readonly state: DurableObjectState) {}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.state.acceptWebSocket(server);
		this.broadcastCount();

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketClose(): Promise<void> {
		this.broadcastCount();
	}

	async webSocketError(): Promise<void> {
		this.broadcastCount();
	}

	private broadcastCount(): void {
		const sockets = this.state.getWebSockets();
		// getWebSockets() still includes a socket during its own webSocketClose/webSocketError
		// callback, so count only sockets that are actually open.
		const openSockets = sockets.filter((ws) => ws.readyState === WebSocket.READY_STATE_OPEN);
		const payload = JSON.stringify({ watching: openSockets.length });
		for (const ws of openSockets) {
			try {
				ws.send(payload);
			} catch {
				// Socket may already be closing between getWebSockets() and send(); the next
				// close/open event will re-broadcast a corrected count.
			}
		}
	}
}
