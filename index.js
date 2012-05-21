var socketio = require('socket.io')
  , async = require('async')
  , util = require('util');

function middleware(socket, stack) {
  return function(req, callback) {
    var payload = {req: req || {}, res: {}};
    
    async.forEachSeries(stack, function(fn, next) {
      fn(socket, payload, next);
    }, function(err) {
      if (!callback) return;
      
      if (err) {
        callback({error: err.message});
      } else {
        callback(payload.res);
      }
    });
  };
}

var slice = Array.prototype.slice;

function mw(http) {
  var io = socketio.listen(server);
  var stacks = {};
  
  io.sockets.on('connection', bind);
  
  function on(events) {
    util.isArray(events) || (events = [events]);
    
    events.forEach(function(event) {
      stacks[event] = slice.call(arguments, 1);
    });
  }
  
  function bind(socket) {
    stacks.forEach(function(stack, event) {
      socket.on(event, middleware(socket, stack));
    });
  }
  
  function configure() {
    io.configure.apply(this.io, arguments);
  }
  
  return {
    on: on, configure: configure
  };
}

exports.listen = function(http) {
  return new mw(http);
};