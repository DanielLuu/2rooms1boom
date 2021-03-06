function cleanUpGamesAndPlayers(){
  var cutOff = moment().subtract(2, 'hours').toDate().getTime();

  var numGamesRemoved = Games.remove({
    createdAt: {$lt: cutOff}
  });

  var numPlayersRemoved = Players.remove({
    createdAt: {$lt: cutOff}
  });
}

function getRandomLocation(){
  var locationIndex = Math.floor(Math.random() * locations.length);
  return locations[locationIndex];
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function assignRoles(players, location){
  var roles = [];

  for (i = 0; i < (players.count() - 2)/2; i++) {
    roles.push('locations.roles.airplane.red');
    roles.push('locations.roles.airplane.blue');
  }
  var shuffled_roles = shuffleArray(roles);
  var role = null;

  players.forEach(function(player){
    if (!player.isBomber && !player.isPresident){
      role = shuffled_roles.pop();

      Players.update(player._id, {$set: {role: role}});
    }
  });
}

function assignRooms(players){
  var roomsAssigns = [];
  for (i = 0; i < players.count()/2; i++) {
    roomsAssigns.push(true);
    roomsAssigns.push(false);
  }
  var shuffled_rooms = shuffleArray(roomsAssigns);
  var roomsAssign = null;

  players.forEach(function(player){
    roomsAssign = shuffled_rooms.pop();
    Players.update(player._id, {$set: {isRoom1: roomsAssign}});
  });
}

function assignLeaders(players, id){
  var room1 = [];
  var room2 = [];
  players.forEach(function(player){
    if (player.isRoom1){
      room1.push(player);
    } else {
      room2.push(player);
    }
  });

  var leader1Index = Math.floor(Math.random() * room1.length);
  var leader2Index = Math.floor(Math.random() * room2.length);

  Games.update(id, {$set: {leaderRoomOne: room1[leader1Index]._id, leaderRoomTwo: room2[leader1Index]._id }});
}

Meteor.startup(function () {
  // Delete all games and players at startup
  Games.remove({});
  Players.remove({});
});

var MyCron = new Cron(60000);

MyCron.addJob(5, cleanUpGamesAndPlayers);

Meteor.publish('games', function(accessCode) {
  return Games.find({"accessCode": accessCode});
});

Meteor.publish('players', function(gameID) {
  return Players.find({"gameID": gameID});
});

Games.find({"state": 'settingUp'}).observeChanges({
  added: function (id, game) {
    var location = getRandomLocation();
    var players = Players.find({gameID: id});
    var gameEndTime = moment().add(game.lengthInMinutes, 'minutes').valueOf();

    var roleIndex = [];
    for (i = 0; i < players.count(); i++){
      roleIndex.push(i);
    }
    var shuffledRoles = shuffleArray(roleIndex);

    var bomberIndex = shuffledRoles.pop();
    var presidentIndex = shuffledRoles.pop();
    
    players.forEach(function(player, index){
      Players.update(player._id, {$set: {
        isBomber: index === bomberIndex,
        isPresident: index === presidentIndex
      }});
    });

    assignRoles(players, location);
    assignRooms(players);
    assignLeaders(players, id);

    Games.update(id, {$set: {state: 'inProgress', location: location, endTime: gameEndTime, paused: false, pausedTime: null}});
  }
});