Meteor.methods({
	updateLeader: function(playerId, gameId, room) {
		if(room === "1") {
			Games.update(gameId, {$set: {leaderRoomOne: playerId}});
		} 
		else {
			Games.update(gameId, {$set: {leaderRoomTwo: playerId}});
		}
	},
	updateHostage: function(playerId, gameId, room) {
		if(room === "1") {
			if(Games.findOne(gameId).hostageRoomOne === playerId){
				Games.update(gameId, {$set: {hostageRoomOne: null}});
			} else {
				Games.update(gameId, {$set: {hostageRoomOne: playerId}});
			}
		} 
		else {
			if(Games.findOne(gameId).hostageRoomTwo === playerId){
				Games.update(gameId, {$set: {hostageRoomTwo: null}});
			} else {
				Games.update(gameId, {$set: {hostageRoomTwo: playerId}});
			}
		}
	}
})