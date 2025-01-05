/*
 * Quick class for websocket authentication.
 */
class AuthResult {
	bError = false;
	errorMessage = "";
	user = null;
	userMessage = "";
}

exports.AuthResult = AuthResult;