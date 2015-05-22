var corsify = require('corsify');
var pumpify = require('pumpify');
var iterate = require('random-iterate');
var limiter = require('size-limit-stream');
var eos = require('end-of-stream');
var Router = require('routes');
var rack = require('hat').rack();
var concat = require('concat-stream');

module.exports = function (opts) {
  var hub = new Hub(opts);
  return hub.handle.bind(hub);
};

function sendError (res, code) {
  res.statusCode = code;
  res.end();
}

function Hub (opts) {
  if (!opts) opts = {};
  this.maxSubscribers = opts.maxSubscribers || Infinity;
  this.maxMessageSize = opts.maxMessageSize || (64 * 1024);
  this.channels = {};
  var cors = corsify({ 'Access-Control-Allow-Methods': 'POST, GET' });
  var router = this.router = Router();
  router.addRoute('/broadcast/:id', cors(this.broadcast.bind(this)));
  router.addRoute('/subscribe/:id?', cors(this.subscribe.bind(this)));
}

Hub.prototype.handle = function (req, res) {
  var m = this.router.match(req.url);
  if (m)
    return m.fn(req, res, m.params);
  sendError(res, 404);
};

Hub.prototype.broadcast = function (req, res, params) {
  if ('POST' !== req.method)
    return sendError(res, 405);

  var self = this;
  pumpify(req, limiter(self.maxMessageSize), concat(next))
    .on('error', function () { sendError(res, 500) });

  function next (buf) {
    var channel = self.channels[params.id];
    if (!channel)
      return sendError(res, 404);
    var ite = iterate(channel.subscribers);
    var next, cnt = 0;
    while ((next = ite()) && cnt++ < self.maxSubscribers) {
      next.write('data: ' + buf.toString() + '\n\n');
    }
    res.end();
  }
};

Hub.prototype.subscribe = function (req, res, params) {
  if (req.headers.accept !== 'text/event-stream')
    return sendError(res, 406);

  var id, channel;

  if ('POST' === req.method) {
    channel = this.create();
    id = channel.id;
    res.statusCode = 201;
  } else if ('GET' === req.method) {
    id = params.id;
    channel = this.channels[id];
    if (!id || !channel) return sendError(res, 404);
  } else return sendError(res, 405);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  channel.subscribers.push(res);

  if (channel.subscribers.length === 1) {
    var resource = 'https://' + req.headers.host + '/subscribe/' + id;
    res.setHeader('Link', '<' + resource +  '>; rel="channel"');
  }

  var self = this;
  eos(res, function () {
    var ix = channel.subscribers.indexOf(res);
    if (~ix) channel.subscribers.splice(ix, 1);
    if (!channel.subscribers.length) delete self.channels[channel.id];
  });

  if (res.flushHeaders) res.flushHeaders();
};

Hub.prototype.create = function () {
  var id, tries = -1;
  while (this.channels.hasOwnProperty(id = rack()) && ++ tries < 4)
    continue;
  if (tries > 3)
    return sendError(res, 500);
  this.channels[id] = { id: id, subscribers: [] };
  return this.channels[id];
};
