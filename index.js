var _ = require('underscore')
  , socketio = require('socket.io')
  , async = require('async');

function middleware(event, socket, stack) {
  return function(req, callback) {
    // get the client ip address
    var ip = socket.handshake.headers['x-forwarded-for'] ||
             socket.handshake.address.address;

    var payload = {
      event: event
    , req: req || {}
    , res: {}
    , ip: ip
    };

    async.forEachSeries(stack, function(fn, next) {
      fn(socket, payload, next);
    }, function(err) {
      if (!callback) {
        return;
      }

      if (err) {
        callback({error: parseError(err)});
      } else {
        callback(payload.res);
      }
    });
  };
}

function parseError(err) {
  if (_.isFunction(err.toJSON)) {
    return err.toJSON();
  }

  var result = {
    name: err.name
  , message: err.message
  };

  if (err.data) {
    result.data = err.data;
  }

  return result;
}

function mw(http) {
  var io = socketio.listen(http);
  var stacks = {};

  io.sockets.on('connection', function(socket) {
    _.each(stacks, function(stack, event) {
      socket.on(event, middleware(event, socket, stack));
    });
  });

  return {
    on: function on(events) {
      var fn = _.rest(arguments);

      _.isArray(events) || (events = [events]);

      events.forEach(function(event) {
        stacks[event] || (stacks[event] = []);
        stacks[event] = stacks[event].concat(fn);
      });
    },

    configure: function() {
      return io.configure.apply(io, arguments);
    },

    set: function() {
      return io.set.apply(io, arguments);
    }
  };
}

exports.listen = function(http) {
  return new mw(http);
};