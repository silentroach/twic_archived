/**
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */

/**
 * @constructor
 */
twic.Accounts = function() {

	var self = this;
	
	self.items = undefined;

	twic.requests.subscribe('accountAdd', function(data, sendResponse) {
		sendResponse( { } );

		twic.api.getRequestToken( function(token, secret) {
			twic.api.tryGrantAccess(token);
		} );
	} );

	twic.requests.subscribe('accountList', function(data, sendResponse) {
		var accs = [];
		
		for (var id in self.items) {
			var item = self.items[id];
			
			accs.push( {
				'id': id,
				'avatar': item.user.fields['avatar'],
				'screen_name': item.user.fields['screen_name']
			} );
		}

		sendResponse(accs);
	} );

	twic.requests.subscribe('accountAuth', function(data, sendResponse) {
		if (
			!('pin' in data)
			|| !('user_id' in data)
		) {
			sendResponse( {
				// todo make reply identifiers const
				'res': 0
			} );

			return;
		}

		var
			userid = data['user_id'],
			account = self.getInfo(userid);

		if (account) {
			sendResponse( {
				'res': 2
			} );

			return;
		}

		twic.api.getAccessToken(data['pin'], function(data) {

			var afterAll = function() {
				self.update();
				
				// reset the token after auth is complete
				twic.api.resetToken();
			};

			var checkUser = function(id) {
				var user = new twic.db.obj.User();
				user.loadById(id, afterAll, function() {
					// not found. lets get it
					twic.api.userinfo(id, function(info) {
						user.loadFromJSON(info);
						user.save(afterAll);
					} );
				} );
			};

			var updateAccount = function(account) {
				account.setValue('oauth_token', data['oauth_token']);
				account.setValue('oauth_token_secret', data['oauth_token_secret']);
				account.save();

				sendResponse( {
					'res': 1
				} );

				checkUser(account.fields['id']);
			};

			account = new twic.db.obj.Account();
			account.loadById(userid, function() {
				// found? great, let's modify oauth data
				updateAccount(account);
			}, function() {
				account.setValue('id', userid);
				updateAccount(account);
			} );
		} );
	} );
};

/**
 * Clear the accounts array
 */
twic.Accounts.prototype.clear = function() {
	this.items = { };
};

/**
 * Update accounts info
 */
twic.Accounts.prototype.update = function() {
	var 
		accounts = this;
		tmpAccount = new twic.db.obj.Account(),
		tmpUser    = new twic.db.obj.User();

	accounts.clear();

	twic.db.select(
		'select ' + tmpAccount.getFieldString('a') + ', ' + tmpUser.getFieldString('u') + ' ' +
		'from accounts a ' +
			'inner join users u on ( ' +
				'u.id = a.id ' +
			') ' +
		'order by u.screen_name ', [], 
		function() {
			var 
				accs = new twic.DBObjectList(twic.db.obj.Account),
				usrs = new twic.DBObjectList(twic.db.obj.User);
		
			accs.load(this, 'a');
			usrs.load(this, 'u');
		
			for (var id in accs.items) {
				var tmp = accs.items[id];
				tmp.user = usrs.items[id];
				
				accounts.items[id] = tmp;
			}
	} );
};

/**
 * Get user info
 * @param {number} id User id
 * @return {Object|boolean} Account or false
 */
twic.Accounts.prototype.getInfo = function(id) {
	if (id in this.items) {
		return this.items[id];
	}
	
	return false;
};
