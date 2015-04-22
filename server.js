//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var socketio = require('socket.io');
var express = require('express');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];
var num_users = 0;


io.on('connection', function(socket) {
    
  // This code runs when a socket connects for the first time
  
  // Add the new socket
  sockets.push(socket);
  
  // Increase the number of users since the server has started
  num_users += 1;
  
  // Give this socket a unique user number
  socket.user_num = num_users;
  socket.blocked = false;

  // Send everyone the roster, which also identifies this socket to itself
  broadcast_roster();

  // When this socket disconnects...
  socket.on('disconnect', function() {
    // Remove it
    sockets.splice(sockets.indexOf(socket), 1);
    // And tell the remaining sockets to update their rosters
    broadcast_roster();
  });

  // When this socket sends a toggle message to block/unblock someone...
  socket.on('unblock', function(user_num) {
    console.log('Unblocking user', user_num);
    var socket_to_toggle = socket_for_user_num(user_num);
    if (socket_to_toggle) {
      socket_to_toggle.blocked = false;
      broadcast('unblock', user_num, user_num);
      socket_to_toggle.emit('you_are_unblocked');
    }
    else {
      console.log("--- Couldn't find socket for", user_num);
    }
  });
  socket.on('block', function(user_num) {
    var socket_to_toggle = socket_for_user_num(user_num);
    console.log('Blocking user', user_num);
    if (socket_to_toggle) {
      socket_to_toggle.blocked = true;
      broadcast('block', user_num, user_num);
      socket_to_toggle.emit('you_are_blocked');
    }
    else {
      console.log("--- Couldn't find socket for", user_num);
    }
  });
  
});


// Global functions

// Return the socket for a particular unique user number
function socket_for_user_num(user_num) {
  for (var i = 0; i < sockets.length; i++) {
    if (parseInt(sockets[i].user_num) == parseInt(user_num)) {
      return sockets[i];
    }
  }
}

// Send the roster to all sockets
function broadcast_roster() {
  sockets.forEach(function(to_socket) {
    to_socket.emit('roster', sockets.map(function(socket) {
      return {
        user_num: socket.user_num,
        blocked: socket.blocked,
        is_you: socket.user_num == to_socket.user_num
      };
    }));
  });  
}

// Send a message to all sockets
// event is a string, the name of the message
// data is any object, the payload
// except_user_num is optional; if specified, the message won't be sent to the socket with that user_num
function broadcast(event, data, except_user_num) {
  sockets.forEach(function(socket) {
    if ((except_user_num == undefined) || (except_user_num != socket.user_num)) {
      socket.emit(event, data);
    }
  });
}


// Start the server!

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
