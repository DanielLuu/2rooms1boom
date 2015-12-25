Handlebars.registerHelper('toCapitalCase', function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

function initUserLanguage() {
  var language = amplify.store("language");

  if (language){
    Session.set("language", language);
  }

  setUserLanguage(getUserLanguage());
}

function getUserLanguage() {
  var language = Session.get("language");

  if (language){
    return language;
  } else {
    return "en";
  }
};

function setUserLanguage(language) {
  TAPi18n.setLanguage(language).done(function () {
    Session.set("language", language);
    amplify.store("language", language);
  });
}

function getLanguageDirection() {
  var language = getUserLanguage()
  var rtlLanguages = ['he', 'ar'];

  if ($.inArray(language, rtlLanguages) !== -1) {
    return 'rtl';
  } else {
    return 'ltr';
  }
}

function getLanguageList() {
  var languages = TAPi18n.getLanguages();
  var languageList = _.map(languages, function(value, key) {
    var selected = "";
    
    if (key == getUserLanguage()){
      selected = "selected";
    }

    // Gujarati isn't handled automatically by tap-i18n,
    // so we need to set the language name manually
    if (value.name == "gu"){
        value.name = "ગુજરાતી";
    }

    return {
      code: key,
      selected: selected,
      languageDetails: value
    };
  });
  
  if (languageList.length <= 1){
    return null;
  }
  
  return languageList;
}

function getCurrentGame(){
  var gameID = Session.get("gameID");

  if (gameID) {
    return Games.findOne(gameID);
  }
}

function getAccessLink(){
  var game = getCurrentGame();

  if (!game){
    return;
  }

  return Meteor.settings.public.url + game.accessCode + "/";
}


function getCurrentPlayer(){
  var playerID = Session.get("playerID");

  if (playerID) {
    return Players.findOne(playerID);
  }
}

function generateAccessCode(){
  var code = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";

    for(var i=0; i < 6; i++){
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return code;
}

function generateNewGame(){
  var game = {
    accessCode: generateAccessCode(),
    state: "waitingForPlayers",
    location: null,
    lengthInMinutes: 2,
    endTime: null,
    paused: false,
    pausedTime: null,
    round: 0
  };

  var gameID = Games.insert(game);
  game = Games.findOne(gameID);

  return game;
}

function generateNewPlayer(game, name){
  var player = {
    gameID: game._id,
    name: name,
    role: null,
    isBomber: false,
    isPresident: false,
    isRoom1: false,
    votes: 0,
    voted: false
  };

  var playerID = Players.insert(player);

  return Players.findOne(playerID);
}

function resetUserState(){
  var player = getCurrentPlayer();

  if (player){
    Players.remove(player._id);
  }

  Session.set("gameID", null);
  Session.set("playerID", null);
}

function trackGameState () {
  var gameID = Session.get("gameID");
  var playerID = Session.get("playerID");

  if (!gameID || !playerID){
    return;
  }

  var game = Games.findOne(gameID);
  var player = Players.findOne(playerID);

  if (!game || !player){
    Session.set("gameID", null);
    Session.set("playerID", null);
    Session.set("currentView", "startMenu");
    return;
  }

  if(game.state === "inProgress"){
    Session.set("currentView", "gameView");
    Tracker.autorun(checkRounds);
  } else if (game.state === "waitingForPlayers") {
    Session.set("currentView", "lobby");
  }
}

function leaveGame () {  
  GAnalytics.event("game-actions", "gameleave");
  var player = getCurrentPlayer();

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);
}

function hasHistoryApi () {
  return !!(window.history && window.history.pushState);
}

initUserLanguage();

Meteor.setInterval(function () {
  Session.set('time', new Date());
}, 1000);

if (hasHistoryApi()){
  function trackUrlState () {
    var accessCode = null;
    var game = getCurrentGame();
    if (game){
      accessCode = game.accessCode;
    } else {
      accessCode = Session.get('urlAccessCode');
    }
    
    var currentURL = '/';
    if (accessCode){
      currentURL += accessCode+'/';
    }
    window.history.pushState(null, null, currentURL);
  }
  Tracker.autorun(trackUrlState);
}
Tracker.autorun(trackGameState);

window.onbeforeunload = resetUserState;
window.onpagehide = resetUserState;

FlashMessages.configure({
  autoHide: true,
  autoScroll: false
});

Template.main.helpers({
  whichView: function() {
    return Session.get('currentView');
  },
  language: function() {
    return getUserLanguage();
  },
  textDirection: function() {
    return getLanguageDirection();
  }
});

Template.footer.helpers({
  languages: getLanguageList
})

Template.footer.events({
  'click .btn-set-language': function (event) {
    var language = $(event.target).data('language');
    setUserLanguage(language);
    GAnalytics.event("language-actions", "set-language-" + language);
  },
  'change .language-select': function (event) {
    var language = event.target.value;
    setUserLanguage(language);
    GAnalytics.event("language-actions", "set-language-" + language);
  }
})

Template.startMenu.events({
  'click #btn-new-game': function () {
    Session.set("currentView", "createGame");
  },
  'click #btn-join-game': function () {
    Session.set("currentView", "joinGame");
  }
});

Template.startMenu.helpers({
  alternativeURL: function() {
    return Meteor.settings.public.alternative;
  }
});

Template.startMenu.rendered = function () {
  GAnalytics.pageview("/");

  resetUserState();
};

Template.createGame.events({
  'submit #create-game': function (event) {
    GAnalytics.event("game-actions", "newgame");

    var playerName = event.target.playerName.value;

    if (!playerName || Session.get('loading')) {
      return false;
    }

    var game = generateNewGame();
    var player = generateNewPlayer(game, playerName);

    Meteor.subscribe('games', game.accessCode);

    Session.set("loading", true);
    
    Meteor.subscribe('players', game._id, function onReady(){
      Session.set("loading", false);

      Session.set("gameID", game._id);
      Session.set("playerID", player._id);
      Session.set("currentView", "lobby");
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.createGame.helpers({
  isLoading: function() {
    return Session.get('loading');
  }
});

Template.createGame.rendered = function (event) {
  $("#player-name").focus();
};

Template.joinGame.events({
  'submit #join-game': function (event) {
    GAnalytics.event("game-actions", "gamejoin");

    var accessCode = event.target.accessCode.value;
    var playerName = event.target.playerName.value;

    if (!playerName || Session.get('loading')) {
      return false;
    }

    accessCode = accessCode.trim();
    accessCode = accessCode.toLowerCase();

    Session.set("loading", true);

    Meteor.subscribe('games', accessCode, function onReady(){
      Session.set("loading", false);

      var game = Games.findOne({
        accessCode: accessCode
      });

      if (game) {
        Meteor.subscribe('players', game._id);
        player = generateNewPlayer(game, playerName);

        if (game.state === "inProgress") {
          var default_role = game.location.roles[game.location.roles.length - 1];
          Players.update(player._id, {$set: {role: default_role}});
        }

        Session.set('urlAccessCode', null);
        Session.set("gameID", game._id);
        Session.set("playerID", player._id);
        Session.set("currentView", "lobby");
      } else {
        FlashMessages.sendError(TAPi18n.__("ui.invalid access code"));
        GAnalytics.event("game-actions", "invalidcode");
      }
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set('urlAccessCode', null);
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.joinGame.helpers({
  isLoading: function() {
    return Session.get('loading');
  }
});


Template.joinGame.rendered = function (event) {
  resetUserState();

  var urlAccessCode = Session.get('urlAccessCode');

  if (urlAccessCode){
    $("#access-code").val(urlAccessCode);
    $("#access-code").hide();
    $("#player-name").focus();
  } else {
    $("#access-code").focus();
  }
};

Template.lobby.helpers({
  game: function () {
    return getCurrentGame();
  },
  accessLink: function () {
    return getAccessLink();
  },
  player: function () {
    return getCurrentPlayer();
  },
  players: function () {
    var game = getCurrentGame();
    var currentPlayer = getCurrentPlayer();

    if (!game) {
      return null;
    }

    var players = Players.find({'gameID': game._id}, {'sort': {'createdAt': 1}}).fetch();

    players.forEach(function(player){
      if (player._id === currentPlayer._id){
        player.isCurrent = true;
      }
    });

    return players;
  },
  isLoading: function() {
    var game = getCurrentGame();
    return game.state === 'settingUp';
  }
});

Template.lobby.events({
  'click .btn-leave': leaveGame,
  'click .btn-start': function () {
    GAnalytics.event("game-actions", "gamestart");

    var game = getCurrentGame();
    Games.update(game._id, {$set: {state: 'settingUp'}});
  },
  'click .btn-toggle-qrcode': function () {
    $(".qrcode-container").toggle();
  },
  'click .btn-remove-player': function (event) {
    var playerID = $(event.currentTarget).data('player-id');
    Players.remove(playerID);
  },
  'click .btn-edit-player': function (event) {
    var game = getCurrentGame();
    resetUserState();
    Session.set('urlAccessCode', game.accessCode);
    Session.set('currentView', 'joinGame');
  }
});

Template.lobby.rendered = function (event) {
  var url = getAccessLink();
  var qrcodesvg = new Qrcodesvg(url, "qrcode", 250);
  qrcodesvg.draw();
};

function getTimeRemaining(){
  var game = getCurrentGame();
  var localEndTime = game.endTime - TimeSync.serverOffset();

  if (game.paused){
    var localPausedTime = game.pausedTime - TimeSync.serverOffset();
    var timeRemaining = localEndTime - localPausedTime;
  } else {
    var timeRemaining = localEndTime - Session.get('time');
  }

  if (timeRemaining < 0) {
    timeRemaining = 0;
  }

  return timeRemaining;
}

function getRoundsRemaining(){
  var game = getCurrentGame();
  var players = Players.find({
    'gameID': game._id
  });
  if (players.count() > 10){
    return game.round - 5;
  } else {
    return game.round - 3; 
  }
}

function checkVotes(game, players, room) {
  var totalVotes = 0;
  var maxVotes = -1;
  var newLeader = null;

  players.forEach(function(player){
    if(room === "1") {
      if (player.isRoom1 == true) {
        if(player.votes > maxVotes) {
          maxVotes = player.votes;
          newLeader = player._id;
        }
        totalVotes += player.votes;
      }
    } else {
      if (player.isRoom1 == false) {
        if(player.votes > maxVotes) {
          maxVotes = player.votes;
          newLeader = player._id;
        }
        totalVotes += player.votes;
      }
    }
  });
  if (totalVotes == players.count()/2){
    if(room === "1"){
      Games.update(game._id, {$set: {isVoting1: false}});
    } else {
      Games.update(game._id, {$set: {isVoting2: false}});
    }
    Meteor.call('updateLeader', newLeader, game._id, room, function(err, res) {
      console.log(err);
      console.log(res);
    });
    players.forEach(function(player){
      if(room === "1") {
        if (player.isRoom1 == true) {
          Players.update(player._id, {$set: {voted: false, votes: 0}});
        }
      } else {
        if (player.isRoom1 == false) {
          Players.update(player._id, {$set: {voted: false, votes: 0}});
        }
      }
    });
  }
}

function checkRounds() {
  var game = getCurrentGame();
  var players = Players.find({
    'gameID': game._id
  });

  if (game.isVoting1) {
    checkVotes(game, players, "1");
  } else if (game.isVoting2) {
    checkVotes(game, players, "2");
  }

  if (getRoundsRemaining() < 0 && getTimeRemaining() == 0) {
    players.forEach(function(player){
      if (player._id === game.hostageRoomOne){
        Players.update(player._id, {$set: {isRoom1: false}});
      } else if (player._id === game.hostageRoomTwo){
        Players.update(player._id, {$set: {isRoom1: true}});
      }
    });
    var newRound = game.round + 1;
    var gameEndTime = moment().add(game.lengthInMinutes, 'minutes').valueOf();
    console.log('checking');
    Games.update(game._id, {$set: {hostageRoomOne: null, hostageRoomTwo: null, round: newRound, endTime: gameEndTime}});
  }
}

Template.gameView.helpers({
  game: getCurrentGame,
  isLeader: function(id) {
    var game = getCurrentGame(); 
    return game.leaderRoomOne === id || game.leaderRoomTwo === id;
  },
  leaderRoomOne: function (id) {
    var game = getCurrentGame();
    return game.leaderRoomOne === id;

  },
  leaderRoomTwo: function (id) {
    var game = getCurrentGame();
    return game.leaderRoomTwo === id;
  },
  isHostage: function(id) {
    var game = getCurrentGame(); 
    return game.hostageRoomOne === id || game.hostageRoomTwo === id;
  },
  hostageRoomOne: function (id) {
    var game = getCurrentGame();
    return game.hostageRoomOne === id;
  },
  hostageRoomTwo: function (id) {
    var game = getCurrentGame();
    return game.hostageRoomTwo === id;
  },
  getVotes: function(id) {
    var player = Players.findOne(id); 
    return player.votes;
  },
  isVoting1: function () {
    var game = getCurrentGame();
    return game.isVoting1;
  },
  isVoting2: function () {
    var game = getCurrentGame();
    return game.isVoting2;
  },
  player: getCurrentPlayer,
  players: function () {
    var game = getCurrentGame();
    
    if (!game){
      return null;
    }

    var players = Players.find({
      'gameID': game._id
    });

    return players;
  },
  locations: function () {
    return locations;
  },
  gameFinished: function () {
    var timeRemaining = getTimeRemaining();
    var roundsRemaining = getRoundsRemaining();
    return (roundsRemaining === 0 && timeRemaining === 0);
  },
  timeRemaining: function () {
    var timeRemaining = getTimeRemaining();

    return moment(timeRemaining).format('mm[<span>:</span>]ss');
  },
  half: function(num) {
    return num/2;
  }
});

Template.gameView.events({
  'click .btn-leave': leaveGame,
  'click .btn-end': function () {
    GAnalytics.event("game-actions", "gameend");

    var game = getCurrentGame();
    Games.update(game._id, {$set: {state: 'waitingForPlayers'}});
  },
  'click .btn-toggle-status': function () {
    $(".status-container-content").toggle();
  },
  'click .game-countdown': function () {
    var game = getCurrentGame();
    var currentServerTime = TimeSync.serverTime(moment());

    if(game.paused){
      GAnalytics.event("game-actions", "unpause");
      var newEndTime = game.endTime - game.pausedTime + currentServerTime;
      Games.update(game._id, {$set: {paused: false, pausedTime: null, endTime: newEndTime}});
    } else {
      GAnalytics.event("game-actions", "pause");
      Games.update(game._id, {$set: {paused: true, pausedTime: currentServerTime}});
    }
  },
  'click .player-name': function (event) {
    var game = getCurrentGame();
    var playerId = event.target.getAttribute('data-id');
    var room = event.target.getAttribute('data-room');
    var gameId = Games.findOne()._id;
    var currentPlayer = getCurrentPlayer();
    if (game.isVoting1 || game.isVoting2) {
      // if ((currentPlayer.isRoom1 ==  true && room == 1) || (currentPlayer.isRoom1 ==  false && room == 2)) {
      if (currentPlayer.voted == false) {
        var newVotes = Players.findOne(playerId).votes + 1;
        Players.update(playerId, {$set: {votes: newVotes}});
        Players.update(currentPlayer._id, {$set: {voted: true}});
      }
    } else if ((currentPlayer._id ===  game.leaderRoomOne && room == 1) || (currentPlayer._id ===  game.leaderRoomTwo && room == 2)) {
      Meteor.call('updateHostage', playerId, gameId, room, function(err, res) {
        console.log(err);
        console.log(res);
      }); 
    }
  },
  'click .btn-vote': function () {
    var game = getCurrentGame();
    var currentPlayer = getCurrentPlayer();
    if (currentPlayer.isRoom1 == true){
      Games.update(game._id, {$set: {isVoting1: true}});  
    } else {
      Games.update(game._id, {$set: {isVoting2: true}});
    } 
  },
  'click .btn-cancel-vote': function () {
    var game = getCurrentGame();
    var players = Players.find({
      'gameID': game._id
    });
    if (game.isVoting1 == true){
      Games.update(game._id, {$set: {isVoting1: false}});
      players.forEach(function(player){
        if (player.isRoom1 == true) {
          Players.update(player._id, {$set: {voted: false, votes: 0}});
        }
      });
    } else if (game.isVoting2 == true){
      Games.update(game._id, {$set: {isVoting2: false}});
      players.forEach(function(player){
        if (player.isRoom1 == false) {
          Players.update(player._id, {$set: {voted: false, votes: 0}});
        }
      });
    }
  }
});
