const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const {GameServer} = require("./server/game-server.js");
const websocket = require('ws');
const logger = require("./logger.js");
const serverConfig = require('./server/server-config.json');
const {AuthResult} = require("./server/auth-result.js");

const app = express();
const port = 7000;

//create headless websocket server
const wssConfig = {
	noServer: true,
	clientTracking: true
}

const wss = new websocket.Server(wssConfig);

//create http server
const expressServer = app.listen(port, () => {logger.log("info", 'Webserver listening on port ' + port)});

//make the game server
var gs = new GameServer();
gs.init();

//add middleware to pipeline
app.use(express.json()); //for parsing application/json
app.use(express.urlencoded({extended: false})); //for parsing application/x-www-form-urlencoded
app.use(cookieParser(serverConfig.session_cookie_secret));

//adding basic http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/styles.css', (req, res) => {res.sendFile(path.join(__dirname, "styles.css"));});
app.use('/client-js', express.static(path.join(__dirname, "client-js")));

//specific apis
app.post('/join-request', (req, res) => {gs.handleJoinRequest(req, res)});
app.post('/get-ticket', (req, res) => {gs.handleGetTicket(req, res)});
app.post('/report', (req, res) => {gs.handleReport(req, res)});


//create http upgrade endpoint to do websocket handshake
expressServer.on('upgrade', (req, socket, head) => {
	var ticketFlow = false;
	var authResult = null;

	// check to see if it needs to be the ticket flow or cookie flow
	if (req.headers["sec-websocket-protocol"] !== undefined) {
		var tmp = req.headers["sec-websocket-protocol"].split(",");
		if (tmp.length === 2) {
			var proto = tmp[0].trim();
			var ticket = tmp[1].trim();

			if (proto === "ticket-protocol") {
				ticketFlow = true;
			}
		}

	}

	// ticket flow
	if (ticketFlow === true) {
		authResult = gs.resolveTicket(req, ticket);
	} 
	// cookie flow
	else {
		authResult = gs.wsAuthenticate(req, socket, head);
	}

	//something bad happened in authentication process. Destroy socket and cancel the connection process.
	if(authResult.bError === -1)
	{
		socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); //I don't know how to send "result.userMessage" back. So I'll just send unauthorized for now.
		return;
	}
	//user is authenticated and is in result
	else
	{
		//let the game server handle the websocket callbacks
		return wss.handleUpgrade(req, socket, head, gs.onopen.bind(gs, authResult.user));
	}
})