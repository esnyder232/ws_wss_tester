console.log("Hello from client.js");

var wsh = new WebsocketHandler();
var myname = document.getElementById("name1");
var addr1 = document.getElementById("addr1");
var port1 = document.getElementById("port1");
var port2 = document.getElementById("port2");
var btnconnect = document.getElementById("btnConnect");
var btnDisconnect = document.getElementById("btnDisconnect");
var btnSend = document.getElementById("btnSend");

function connectClick(el) {
	var secureValue = document.querySelector('input[name="radio-secure"]:checked').value;
	var flowValue = document.querySelector('input[name="radio-flow"]:checked').value;
	
	if (flowValue === "cookie") {
		console.log("Cookie flow.");
		cookieFlow(myname.value, addr1.value, port1.value, secureValue === "wss", port2.value);
	} else {
		console.log("Ticket flow.");
		sessionFlow(myname.value, addr1.value, port1.value, secureValue === "wss", port2.value);
	}
}

/*
 * Ticket flow:
 * 1) Get a ticket from "/get-ticket" api, and push username in body.
 * 2) tell the server username in message.
 */
function sessionFlow(myname, addr, port, isSecure, joinRequestPort) {
	var xhr = new XMLHttpRequest();
	var proto = isSecure ? "https" : "http";
	var url = proto + "://" + addr + ":" + joinRequestPort + "/get-ticket";
	xhr.open("POST", url, true);

	xhr.onload = (e) => {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				var res = JSON.parse(xhr.responseText);
				wsh.connectWebSocketTicket(addr, port, isSecure, res.ticket, wsConnected);
			} 
			else {
				console.error("get ticket errored. " + xhr.responseText);
			}
		}
	}

	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.send(JSON.stringify({
		username: myname
	}));
}

/*
 * Cookie flow:
 * 1) call "/join-request" api, and push username in body.
 *  1A) server returns signed cookie with token.
 * 2) connect ws and pass cookie along with it.
 */
function cookieFlow(myname, addr, port, isSecure, joinRequestPort) {
	var xhr = new XMLHttpRequest();
	var proto = isSecure ? "https" : "http";
	var url = proto + "://" + addr + ":" + joinRequestPort + "/join-request";
	xhr.open("POST", url, true);

	xhr.onload = (e) => {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				wsh.connectWebSocket(addr, port, isSecure, wsConnected);
			} 
			else {
				console.error("join request errored. " + xhr.responseText);
			}
		}
	}

	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.send(JSON.stringify({
		username: myname
	}));
}



function disconnectClick(el) {
	wsh.disconnectWebSocket(wsDisconnected);
}

function sendClick(el) {
	wsh.ws.send("hello from " + myname.value);
}

function reportClick(el) {
	var xhr = new XMLHttpRequest();
	var url = "/report";
	xhr.open("POST", url, true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify({
		key: "value"
	}));
}


function wsConnected() {
	console.log("ws connected");
	btnConnect.disabled = true;
	btnDisconnect.disabled = false;
	btnSend.disabled = false;
}

function wsDisconnected() {
	console.log("ws disconnected");
	btnConnect.disabled = false;
	btnDisconnect.disabled = true;
	btnSend.disabled = true;
}