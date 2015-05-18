var cors = require('corsify');
var collect = require('stream-collector');
var pump = require('pump');
var iterate = require('random-iterate');
var limiter = require('size-limit-stream');
var eos = require('end-of-stream');
var Router = require('routes');

var channels = {};

module.exports = function (opts) {
  if (!opts) opts = {};
  opts.maxBroadcasts = opts.maxBroadcasts || Infinity;

  var router = Router();
  router.addRoute('/broadcast/:name', cors(broadcast(opts)));
  router.addRoute('/subscribe/:name', cors(subscribe(opts)));

  return function (req, res) {
    var m = router.match(req.url);
    if (m) m.fn(req, res, m.params);
    else {
      res.statusCode = 404;
      res.end();
    }
  };
};

function get (channel) {
  if (channels[channel]) return channels[channel];
  channels[channel] = { name: channel, subscribers: [] };
  return channels[channel];
}

function broadcast (opts) {
  return function (req, res, params) {
    if ('POST' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }
    var name = params.name;
    collect(pump(req, limiter(64 * 1024)), function (err, data) {
      if (err) return res.end();
      if (!channels[name]) return res.end();
      var channel = get(name);
      data = Buffer.concat(data).toString();
      var ite = iterate(channel.subscribers);
      var next, cnt = 0;
      while ((next = ite()) && cnt++ < opts.maxBroadcasts) {
        next.write('data: ' + data + '\n\n');
      }
      res.end();
    });
  };
}

function subscribe (opts) {
  return function (req, res, params) {
    if ('GET' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }
    var name = params.name;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    var channel = get(name);
    channel.subscribers.push(res);
    eos(res, function () {
      var i = channel.subscribers.indexOf(res);
      if (i > -1) channel.subscribers.splice(i, 1);
      if (!channel.subscribers.length && channel === channels[channel.name])
        delete channels[channel.name];
    });
    if (res.flushHeaders) res.flushHeaders();
  };
}
