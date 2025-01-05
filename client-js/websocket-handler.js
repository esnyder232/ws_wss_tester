/*
 * Just a quick websocket container for testing.
 */
class WebsocketHandler {
	constructor() {
		this.ws = null;
		this.successCb = null;
	}

	connectWebSocket(addr, port, isSecure, successCb) {
		var bFail = false;
		this.successCb = successCb;
		var protocol = isSecure ? "wss" : "ws";
		var wsAddr = protocol + "://" + addr + ":" + port;

		try {
			this.ws = new WebSocket(wsAddr);

			this.ws.onclose = this.onclose.bind(this);
			this.ws.onerror = this.onerror.bind(this);
			this.ws.onopen = this.onopen.bind(this);
			this.ws.onmessage = this.onmessage.bind(this);
		}
		catch(ex) {
			bFail = true;
			console.error(ex);
		}
		
		return bFail;
	}

	connectWebSocketTicket(addr, port, isSecure, ticket, successCb) {
		var bFail = false;
		this.successCb = successCb;
		var protocol = isSecure ? "wss" : "ws";
		var wsAddr = protocol + "://" + addr + ":" + port;

		try {
			this.ws = new WebSocket(wsAddr, ["ticket-protocol", ticket]);

			this.ws.onclose = this.onclose.bind(this);
			this.ws.onerror = this.onerror.bind(this);
			this.ws.onopen = this.onopen.bind(this);
			this.ws.onmessage = this.onmessage.bind(this);
		}
		catch(ex) {
			bFail = true;
			console.error(ex);
		}
		
		return bFail;
	}

	disconnectWebSocket(cb) {
		//if its OPEN or CONNECTING
		if(this.ws.readyState === 0 || this.ws.readyState === 1) {
			this.ws.close();

			if (cb !== undefined) {
				cb();
			}
		}
	}

	onclose(e) {
		console.log("onclose called");
		console.log(e);
		if(e.reason) {
			console.log("WebsocketHandler: Websocket is now closed. Reason: " + e.reason);
		}
	}

	onopen(e) {
		if (this.successCb !== null) {
			this.successCb();
			this.successCb = null;
		}
	}

	onerror(e) {
		console.error("onerror called:" + e);
	}

	//this function queues up the packets to be decoded and processed later at the beginning of the next frame.
	onmessage(e) {
		console.log(e.data);
	}
}