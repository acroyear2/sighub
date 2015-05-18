var corsify = require('corsify');
var collect = require('stream-collector');
var pump = require('pump');
var iterate = require('random-iterate');
var limiter = require('size-limit-stream');
var eos = require('end-of-stream');
var Router = require('routes');
var rack = require('hat').rack();

var channels = {};

module.exports = function (opts) {
  if (!opts) opts = {};
  opts.maxBroadcasts = opts.maxBroadcasts || Infinity;

  var cors = corsify({ 'Access-Control-Allow-Methods': 'POST, GET' });

  var router = Router();
  router.addRoute('/create', cors(create()));
  router.addRoute('/broadcast/:id', cors(broadcast(opts)));
  router.addRoute('/subscribe/:id', cors(subscribe()));

  return function (req, res) {
    var m = router.match(req.url);
    if (m) m.fn(req, res, m.params);
    else {
      res.statusCode = 404;
      res.end();
    }
  };
};

function create () {
  return function (req, res) {
    if ('POST' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }
    var id = rack();
    if (channels.hasOwnProperty(id)) {
      res.statusCode = 500;
      res.end();
    } else {
      channels[id] = { id: id, subscribers: [] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: id }));
    }
  };
}

function broadcast (opts) {
  return function (req, res, params) {
    if ('POST' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }
    var id = params.id;
    collect(pump(req, limiter(64 * 1024)), function (err, data) {
      if (err) {
        res.statusCode = 500;
        return res.end();
      }
      var channel = channels[id];
      if (!channel) {
        res.statusCode = 404;
        return res.end();
      }
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

function subscribe () {
  return function (req, res, params) {
    if ('GET' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }
    var id = params.id;
    var channel = channels[id];
    if (!channel) {
      res.statusCode = 404;
      return res.end();
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    channel.subscribers.push(res);
    eos(res, function () {
      var i = channel.subscribers.indexOf(res);
      if (i > -1) channel.subscribers.splice(i, 1);
      if (!channel.subscribers.length && channel === channels[channel.id])
        delete channels[channel.id];
    });
    if (res.flushHeaders) res.flushHeaders();
  };
}
