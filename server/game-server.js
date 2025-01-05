const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const {GlobalFuncs} = require('./global-funcs.js');
const {WebsocketHandler} = require("./websocket-handler.js");
const {User} = require("./user.js");
const {Ticket} = require("./ticket.js");
const {AuthResult} = require("./auth-result.js");

const serverConfig = require('./server-config.json');
const logger = require("../logger.js");

class GameServer {
	constructor() {
		this.globalfuncs = new GlobalFuncs();
		this.wsArray = [];						// array of existing websockets
		this.globalWsId = 1;					// global id for ws. Incremented everytime a successful connection occurs.
		this.globalUserId = 1;					// global id for users. Incremented everytime a successful join-request is called.
		this.globalTicketId = 1;				// global id for tickets. Incremented everytime a successful get-ticket is called.
		this.users = [];						// array of users with cookies
		this.tickets = [];						// array of tickets for people to join
	}
	init() {}

	wsAuthenticate(req, socket, head) {
		var authResult = new AuthResult();
		var reqCookies = null;
		var cookieSession = "";
		var cookieSessionParsed = "";

		try {
			reqCookies = this.globalfuncs.parseCookies(req);
			cookieSession = reqCookies["user-session"];

			//check if cookie is in request
			if(!cookieSession)
			{
				authResult.bError = true;
				authResult.errorMessage = "Cookie session not found in request.";
				authResult.userMessage = "Cookie session not found in request.";
			}

			//check cookie signature
			if(!authResult.bError)
			{
				cookieSessionParsed = cookieParser.signedCookie(cookieSession, serverConfig.session_cookie_secret);
				if(cookieSessionParsed === false)
				{
					authResult.bError = true;
					authResult.errorMessage = "Invalid cookie signature for cookie session. Cookie: " + cookieSession;
					authResult.userMessage = "Invalid cookie signature.";
				}
			}

			//get the user from the user manager. They SHOULD exist at this point
			if(!authResult.bError)
			{
				authResult.user = this.users.find((x) => {return x.token === cookieSessionParsed});
				if(!authResult.user)
				{
					authResult.bError = true;
					authResult.errorMessage = "User was not found. User session parsed: " + cookieSessionParsed;
					authResult.userMessage = "User was not found.";
				}
			}

			//at this point, if there is no error, the user has been verified. Tell the usermanager to switch the user from "inactive" to "active" users
		}
		catch(ex) {
			authResult.bError = true;
			logger.log("error", ex.stack);
		}

		if(!authResult.bError)
			authResult.userMessage = "success";

		return authResult;
	}


	onopen(user, ws) {
		try {
			//create a websocket handler and useragent
			var wsh = new WebsocketHandler();
			wsh.ws = ws;
			wsh.id = this.globalWsId;
			wsh.userId = user.id;
			wsh.gs = this;

			this.globalWsId++;
			user.isActive = true;

			//setup actual websocket callbacks
			wsh.bindCallbacks();

			//send a message to playing users about the person that joined
			for(var j = 0; j < this.wsArray.length; j++) {
				this.wsArray[j].ws.send(user.username + " has joined.");
			}

			this.wsArray.push(wsh);
		}
		catch(ex) {
			logger.log("info", ex.stack);
		}
	}

	onclose(e, wsh, user) {
		user.isActive = false;
		var index = this.wsArray.findIndex((x) => {return x.id === wsh.id;});
		if(index >= 0) {
			logger.log("info", "Ws successfully spliced off.");
			this.wsArray.splice(index, 1);
		} else {
			logger.log("error", "Error: No ws found to splice off, but user has left.");
		}

		//send a message to playing users about the person that left
		for(var j = 0; j < this.wsArray.length; j++) {
			this.wsArray[j].ws.send(user.username + " has left.");
		}
	}

	onmessage(e, wsh, user) {
		for(var j = 0; j < this.wsArray.length; j++) {
			this.wsArray[j].ws.send(user.username + ": " + e);
		}
	}

	handleJoinRequest(req, res) {
		logger.log("info", "join request called");
		var bError = false;
		var userMessage = "";
		var reqSessionCookie = "";
		var expireDays = 365*10;
		var bUserExists = false;
		var username = "";

		try {
			username = req.body.username;

			//create the user and set the cookie if they don't exist
			reqSessionCookie = req.signedCookies["user-session"];

			//if a session exists, verify it from the session-manager.
			if(reqSessionCookie) {
				var user = this.users.find((x) => {return x.token === reqSessionCookie;});

				//the only other scenario is if userInactive doesn't exist (This scenario means the user has never connected to this site before, or they erased their user session from the lobby with "start new play" button)
				if(!user)
				{
					logger.log("info", "User does not exist at all.");
					bUserExists = false;
				}
				//if the user is already active, deny connection to the new user (this scenario occurs when the user has 2 windows of the same browser connecting to the game at once. IE: 2 chrome tabs connecting to the same game)
				else if(user.isActive)
				{
					bError = true;
					userMessage = "This user is already playing.";
					logger.log("error", "User is already playing.");
				}
				//if the user is found and is inactive, just move on to the next step in the handshake (this scenario occurs when the user refreshes the browser after they have already connected to the game atleast once)
				else if(!user.isActive)
				{
					logger.log("info", "User exists, and is not currently not playing.");
					bUserExists = true;
				}
			}

			if(!bError && !bUserExists)
			{
				//if they don't have a user, create one and set a cookie
				var user = new User();
				
				//16byte game session token
				var token = crypto.randomBytes(16).toString('hex');

				user.token = token;
				user.id = this.globalUserId;
				user.isActive = false;
				user.username = username;
				this.globalUserId++;

				this.users.push(user);

				var cookieOptions = {
					signed: true,
					maxAge: 60000 * 60 * 24 * expireDays,
					httpOnly: true,
					sameSite: serverConfig.cookie_same_site,
					secure: serverConfig.https_enabled
				};

				res.cookie("user-session", user.token, cookieOptions);
			}

			//if there is no error at this point. They can move on to the next step (making the websocket connection);
		}
		catch(ex) {
			userMessage = "Internal server error.";
			//GenFuncs.logErrorGeneral(req.path, "Exception caught in try catch: " + ex, ex.stack, userdata.uid, userMessage);
			logger.log("info", ex.stack);
			bError = true;
		}

		
		//send the response
		var statusResponse = 200;
		if(bError)
			statusResponse = 500;

		// data.main = main;
		res.status(statusResponse).json({userMessage: userMessage});
	}

	handleGetTicket(req, res) {
		logger.log("info", "get ticket called.");

		var t = new Ticket();

		t.id = this.globalTicketId;
		t.token = crypto.randomBytes(16).toString('hex');
		t.ip = req.ip;
		t.username = req.body.username;

		this.globalTicketId++;
		
		this.tickets.push(t);

		// data.main = main;
		res.status(200).json({ticket: t.token});
	}

	resolveTicket(req, ticket) {
		var authResult = new AuthResult();

		try {
			var tIndex = this.tickets.findIndex((x) => {
				return x.token == ticket && x.ip == req.client.remoteAddress;
			});
			if(tIndex < 0)
			{
				authResult.bError = true;
				authResult.errorMessage = "Invalid ticket.";
				authResult.userMessage = "Invalid ticket.";
			}

			// Ticket was found. Create a user, push it onto the array, return user, destroy ticket.
			if(!authResult.bError && tIndex >= 0) {
				var u = new User();
				u.id = this.globalUserId;
				u.username = this.tickets[tIndex].username;
				u.isActive = false;
				
				this.globalTicketId++;

				this.users.push(u);
				authResult.user = u;

				this.tickets.splice(tIndex, 1);
			}
		}
		catch(ex) {
			authResult.bError = true;
			logger.log("error", ex.stack);
		}

		if(!authResult.bError)
			authResult.userMessage = "success";

		return authResult;
	}

	handleReport(req, res) {
		logger.log("info", "--- Report: " + 
			"globalWsId: " + this.globalWsId + 
			", Users.length: " + this.users.length +
			", wsArray.length: " + this.wsArray.length +
			", tickets.length: " + this.tickets.length);
	}


}

exports.GameServer = GameServer;