Meteor.methods({
	updateLeader: function(playerId, gameId, room) {
		if(room === "1") {
			Games.update(gameId, {$set: {leaderRoomOne: playerId}});
		} 
		else {
			Games.update(gameId, {$set: {leaderRoomTwo: playerId}});
		}
	}
})