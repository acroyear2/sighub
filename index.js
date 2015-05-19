var corsify = require('corsify');
var pumpify = require('pumpify');
var iterate = require('random-iterate');
var limiter = require('size-limit-stream');
var eos = require('end-of-stream');
var Router = require('routes');
var rack = require('hat').rack();
var concat = require('concat-stream');

var channels = {};

module.exports = function (opts) {
  if (!opts) opts = {};
  opts.maxBroadcasts = opts.maxBroadcasts || Infinity;
  opts.maxSize = opts.maxSize || (64 * 1024);

  var cors = corsify({ 'Access-Control-Allow-Methods': 'POST, GET' });

  var router = Router();
  router.addRoute('/broadcast/:id', cors(broadcast(opts)));
  router.addRoute('/subscribe/:id?', cors(subscribe()));

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
  var id, tries = -1;
  while (channels.hasOwnProperty(id = rack()) && ++ tries < 4)
    continue;
  if (tries > 3) {
    res.statusCode = 500;
    return res.end();
  }
  channels[id] = { id: id, subscribers: [] };
  return channels[id];
}

function broadcast (opts) {
  return function (req, res, params) {
    if ('POST' !== req.method) {
      res.statusCode = 405;
      return res.end();
    }

    pumpify(req, limiter(opts.maxSize), concat(next))
      .on('error', function () {
        res.statusCode = 500;
        return res.end();
      });

    function next (buf) {
      var channel = channels[params.id];
      if (!channel) {
        res.statusCode = 404;
        return res.end();
      }
      var ite = iterate(channel.subscribers);
      var next, cnt = 0;
      while ((next = ite()) && cnt++ < opts.maxBroadcasts) {
        next.write('data: ' + buf.toString() + '\n\n');
      }
      res.end();
    }
  };
}

function subscribe () {
  return function (req, res, params) {
    if (req.headers.accept !== 'text/event-stream') {
      res.statusCode = 406;
      return res.end();
    }

    var id, channel;

    if ('POST' === req.method) {
      channel = create();
      id = channel.id;
      res.statusCode = 201;
    } else if ('GET' === req.method) {
      id = params.id;
      channel = channels[id];
      if (!id || !channel) {
        res.statusCode = 404;
        return res.end();
      }
    } else {
      res.statusCode = 405;
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    channel.subscribers.push(res);

    if (channel.subscribers.length === 1) {
      var resource = 'https://' + req.headers.host + '/subscribe/' + id;
      res.setHeader('Link', '<' + resource +  '>; rel="channel"');
    }

    eos(res, function () {
      var ix = channel.subscribers.indexOf(res);
      if (~ix) channel.subscribers.splice(ix, 1);
      if (!channel.subscribers.length) delete channels[channel.id];
    });

    if (res.flushHeaders) res.flushHeaders();
  };
}
