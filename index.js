var ssejson = require('ssejson');
var rack = require('hat').rack();
var koa = require('koa');
var compose = require('koa-compose');
var parse = require('co-body');
var cors = require('koa-cors');
var eos = require('end-of-stream');
var PassThrough = require('stream').PassThrough;

module.exports = function (opts) {
  if (!opts) opts = {};

  var app = koa(), channels = {};

  app.use(cors());
  app.use(compose([ send, listen, create ]));

  function *send (next) {
    if ('POST' !== this.request.method) yield next;
    else {
      var m = /^\/+([a-z0-9]+)$/.exec(this.request.path);
      if (!m) this.throw(404);
      var body = yield parse(this, { limit: '10kb' });
      if (!body.data) this.throw(400);
      var id = m[1],
          ch = channels[id];
      if (ch) {
        ch.write(body.data);
        this.response.status = 200;
      }
    }
  }

  function *create () {
    var id, tries = -1;
    while (channels[(id = rack())] && ++ tries < 4)
      continue;
    if (tries > 3) this.throw(500);
    channels[id] = new PassThrough({ objectMode: true });
    this.state.channel = channels[id];
    this.state.id = id;
    this.response.status = 201;
  }

  function *listen (next) {
    if (!this.accepts('text/event-stream')) this.throw(406);
    var m = /^\/+([a-z0-9]+)$/.exec(this.request.path), id;
    if (m) {
      id = m[1];
      this.state.channel = channels[id];
      if (!this.state.channel) this.throw(404);
    } else yield next;

    this.req.setTimeout(Number.MAX_VALUE);
    this.type = 'text/event-stream; charset=utf-8';
    this.set('Cache-Control', 'no-cache');
    this.set('Connection', 'keep-alive');

    id = id || this.state.id;
    var ch = this.state.channel;

    ch.pipe(this.body = ssejson.serialize({}));
    this.body.write({ id: id });

    var self = this;
    eos(this.body, function () {
      if (self.state.id) {
        ch.emit('end');
        ch.emit('close');
        delete channels[self.state.id];
      }
    });
  }

  return app;
}
