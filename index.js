var cors = require('corsify');
var collect = require('stream-collector');
var pump = require('pump');
var iterate = require('random-iterate');
var limiter = require('size-limit-stream');
var eos = require('end-of-stream');

var channels = {};

function get (channel) {
  if (channels[channel]) return channels[channel];
  channels[channel] = { name: channel, subscribers: [] };
  return channels[channel];
}

module.exports = function (opts) {
  if (!opts) opts = {};
  var maxBroadcasts = opts.maxBroadcasts || Infinity;

  return cors(function (req, res) {
    if (req.url === '/') {
      res.end(JSON.stringify({name: 'signalhub', version: require('./package').version}, null, 2) + '\n');
      return;
    }

    if (req.url.slice(0, 4) !== '/v1/') {
      res.statusCode = 404;
      res.end();
      return;
    }

    var name = req.url.slice(4).split('?')[0];

    if (req.method === 'POST') {
      collect(pump(req, limiter(64 * 1024)), function (err, data) {
        if (err) return res.end();
        if (!channels[name]) return res.end();
        var channel = get(name);

        data = Buffer.concat(data).toString();

        var ite = iterate(channel.subscribers);
        var next, cnt = 0;

        while ((next = ite()) && cnt++ < maxBroadcasts) {
          next.write('data: ' + data + '\n\n');
        }

        res.end();
      });
      return;
    }

    if (req.method === 'GET') {
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
      return;
    }

    res.statusCode = 404;
    res.end();
  });
};
