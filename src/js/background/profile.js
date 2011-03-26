/**
 * Profile page support
 *
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */

( function() {

	twic.requests.subscribe('getProfileInfo', function(data, sendResponse) {

		twic.twitter.getUserInfo(data['name'], function(user) {
			sendResponse( user.fields );
		} );

	} );

	twic.requests.subscribe('getProfileFriendshipInfo', function(data, sendResponse) {

		twic.twitter.getFriendshipInfo(data['source_id'], data['target_id'], function(friend) {
			sendResponse( friend.fields );
		} );

	} );

}() );
