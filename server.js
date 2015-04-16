//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));

var sockets = [];

io.on('connection', function(socket) {
    
    // This code runs when a socket connects for the first time
    
    // Tell the new socket about all blocked sockets
    sockets.forEach(function(s) {
      if (s.blocked) {
        socket.emit('block', sockets.indexOf(s));
      }
    });

    // Add the new socket
    sockets.push(socket);

    // When this socket disconnects...
    socket.on('disconnect', function() {
      // Remove it
      sockets.splice(sockets.indexOf(socket), 1);
      // And tell the remaining sockets to update their rosters
      updateRoster();
    });

    // When this socket sends a toggle message...
    socket.on('toggle', function(i) {
      
      var socket_to_toggle = sockets[i];
      
      if (socket_to_toggle.blocked) {
        console.log('Unblocking user', i);
        socket_to_toggle.blocked = false;
        broadcast('unblock', i);
        socket_to_toggle.emit('you_are_unblocked');
      }
      else {
        console.log('Blocking user', i);
        socket_to_toggle.blocked = true;
        broadcast('block', i);
        socket_to_toggle.emit('you_are_blocked');
      }

    });

    // Let this socket give itself a generic name (?)
    socket.on('identify', function (name) {
      socket.set('name', String(name || sockets.indexOf(socket)), function (err) {
        updateRoster();
      });
    });
    
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      // TODO: This also needs to include the block status I think. We might also want to send you_are_(un)blocked messages.
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
