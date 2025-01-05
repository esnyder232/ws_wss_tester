const logger = require("../logger.js");

class GlobalFuncs {
	constructor() {}
	
	//a quick function to add some structure to the messages going across websockets
	sendJsonEvent(socket, event, msg) {
		if (!event) {
			event = "unknown"
		}
		if (!msg) {
			msg = ""
		}

		var data = {
			event: event,
			msg: msg
		}
		socket.send(JSON.stringify(data));
	}

	getJsonEvent(msg) {
		var j = {};
		if (!msg) {
			return j;
		}

		j = JSON.parse(msg);
		return j;
	}

	parseCookies(request) {
		var list = {},
			rc = request.headers.cookie;

		rc && rc.split(';').forEach(function (cookie) {
			var parts = cookie.split('=');
			var key = parts.shift().trim();
			var val = parts.join('=')

			list[key] = decodeURIComponent(val);
		});

		return list;
	}
}

exports.GlobalFuncs = GlobalFuncs;