/**
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */
 
twic.db.obj.Timeline = ( function() {

	/**
	 * Push the tweet into user home timeline
	 * @param {number} userId User identifier
	 * @param {number} tweetId Tweet identifier
	 */
	var pushUserTimelineTweet = function(userId, tweetId) {
		twic.db.select(
			'select user_id from timeline ' +
			'where user_id = ? and tweet_id = ? ' +
			'limit 1 ',
			[userId, tweetId],
			function() {
				var rows = this;
			
				if (rows.length > 0) {
					return;
				}
				
				twic.db.execute(
					'insert into timeline (user_id, tweet_id) ' +
					'values (?, ?) ',
					[userId, tweetId]
				);
			} 
		);
	};

	return {
		pushUserTimelineTweet: pushUserTimelineTweet
	}

} )();