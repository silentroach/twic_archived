/**
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */

twic.twitter = ( function() {

	/**
	 * Get the user info
	 * @param {string} nick Nickname
	 * @param {function()} callback Callback function
	 */
	var getUserInfo = function(nick, callback) {

	};

	/**
	 * Get user timeline
	 * @param {number} id User identifier
	 * @param {function(twic.DBObjectList,twic.DBObjectList)} callback Callback function
	 */
	var getHomeTimeline = function(id, callback) {
		var
			tmpTweet = new twic.db.obj.Tweet(),
			tmpUser  = new twic.db.obj.User();

		twic.db.select(
			'select ' + tmpTweet.getFieldString('t') + ', ' + tmpUser.getFieldString('u') + ' ' +
			'from tweets t ' +
				'inner join timeline tl on (t.id = tl.tweet_id) ' +
				'inner join users u on (t.user_id = u.id) ' +
			'where tl.user_id = ? ' +
			'order by t.id desc limit 20 ',
			[id],
			function() {
				var
					rows = this,
					tweetList = new twic.DBObjectList(twic.db.obj.Tweet),
					userList  = new twic.DBObjectList(twic.db.obj.User),
					i;

				for (i = 0; i <rows.length; ++i) {
					var row = rows.item(i);

					tweetList.pushUnique(row, 't');
					userList.pushUnique(row, 'u');
				}

				callback(tweetList, userList);
			}
		);
	};

	/**
	 * Update the user status
	 * @param {number} id User identifier
	 * @param {string} status New status text
	 * @param {function()} callback Callback function
	 */
	var updateStatus = function(id, status, callback) {
		var account = twic.accounts.getInfo(id);

		if (!account) {
			return;
		}

		twic.api.updateStatus(
			status,
			account.fields['oauth_token'], account.fields['oauth_token_secret'],
			function(tweet) {
				var
					tweetId = tweet['id'],
					tweetObj = new twic.db.obj.Tweet();

				tweetObj.updateFromJSON(tweetId, tweet);

				twic.db.obj.Timeline.pushUserTimelineTweet(id, tweetId);

				if (callback) {
					callback();
				}
			}
		);
	};

	/**
	 * Update user home timeline
	 * @param {number} id User identifier
	 */
	var updateHomeTimeline = function(id) {
		var account = twic.accounts.getInfo(id);

		if (!account) {
			return;
		}

		twic.db.select(
			'select t.id ' +
			'from tweets t inner join timeline tl on (t.id = tl.tweet_id) ' +
			'where tl.user_id = ? order by t.id desc limit 1 ', [id],
			function() {
				var
					rows = this,
					since_id = false;

				if (rows.length > 0) {
					since_id = rows.item(0)['id'];
				}

				twic.api.homeTimeline(
					id, since_id,
					account.fields['oauth_token'], account.fields['oauth_token_secret'],
					function(data) {
						var
							users = [],
							i,
							userId;

						if (data.length === 0) {
							return;
						}

						var incrementUnreadTweets = function() {
							// increment the nread tweets count if it is new
							account.setValue('unread_tweets_count', account.fields['unread_tweets_count'] + 1);
							account.save();
						};

						for (i = 0; i < data.length; ++i) {
							var
								/**
								 * @type {Object}
								 */
								tweet = data[i],
								/**
								 * @type {number}
								 */
								tweetId = tweet['id'];

							userId = tweet['user']['id'];

							if (!users[userId]) {
								users[userId] = tweet['user'];
							}

							var tweetObj = new twic.db.obj.Tweet();
							tweetObj.updateFromJSON(tweetId, tweet);

							twic.db.obj.Timeline.pushUserTimelineTweet(
								id, tweetId,
								tweet['user'] !== id ? incrementUnreadTweets : undefined
							);
						}

						for (userId in users) {
							var
								 /**
								 * @type {Object}
								 */
								user = users[userId];

							var userObj = new twic.db.obj.User();
							userObj.updateFromJSON(userId, user);
						}
					}
				);
			}
		);
	};

	return {
		// getters
		getUserInfo: getUserInfo,
		getHomeTimeline: getHomeTimeline,

		// updaters
		updateHomeTimeline: updateHomeTimeline,
		updateStatus: updateStatus
	};

}() );
