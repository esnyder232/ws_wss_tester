const logger = require("../logger.js");
/*
 * Just a quick class to hold the wss and id and stuff.
 */
class WebsocketHandler {
	constructor() {
		this.id = 0;
		this.userId = 0;
		this.ws = null;
		this.gs = null;
	}

	bindCallbacks() {
		if (this.ws !== null) {
			this.ws.on("close", this.onclose.bind(this));
			this.ws.on("error", this.onerror.bind(this));
			this.ws.on("message", this.onmessage.bind(this));
			this.ws.on("pong", this.onpong.bind(this));
		}
	}

	onclose(e) {
		var user = this.gs.users.find((x) => {return x.id === this.userId;});
		if (user !== null) {
			this.gs.onclose(e, this, user);
		}
	}

	onerror(e) {
		logger.log("error", `onerror called for userid: ${this.userId}. Error: ` + e);
	}

	onpong(e) {
		logger.log("info", 'socket onpong for userid: ${this.userId}: ' + e);
	}

	onmessage(e) {
		var user = this.gs.users.find((x) => {return x.id === this.userId;});
		if (user !== null) {
			this.gs.onmessage(e, this, user);
		}
	}
}

exports.WebsocketHandler = WebsocketHandler;