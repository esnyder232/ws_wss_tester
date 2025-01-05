/*
 * Quick class just for testing users that connect with cookie flow.
 */
class User {
	id = 0;
	username = "";
	token = "";
	isActive = false;		// true: means they are connected. false: not connected.
}

exports.User = User;