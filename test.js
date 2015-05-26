var test = require('tape');
var sighub = require('./');
var http = require('http');
var request = require('request');
var ssejson = require('ssejson');

var app = sighub();
var server = http.createServer(app.callback());

test('setup', function (t) {
  server.listen(6767, function () { t.end() });
});

test('create', function (t) {
  t.plan(3);
  var r = request({ url: 'http://localhost:6767' });
  r.pipe(ssejson.parse()).once('data', function (data) {
    t.ok(data.hasOwnProperty('id'));
    r.abort();
  });
  r.on('response', function (res) {
    t.is(res.statusCode, 201);
    t.is(res.headers['content-type'], 'text/event-stream; charset=utf-8');
  });
});

test('subscribe', function (t) {
  t.plan(3);
  var id;
  var r1 = request({ url: 'http://localhost:6767' });
  r1.pipe(ssejson.parse()).once('data', function (data) {
    id = data.id;
    var r2 = request({ url: 'http://localhost:6767/' + data.id });
    r2.on('response', function (res) {
      t.is(res.statusCode, 200);
      t.is(res.headers['content-type'], 'text/event-stream; charset=utf-8');
    });
    r2.pipe(ssejson.parse()).once('data', function (data) {
      t.is(data.id, id);
      r1.abort();
      r2.abort();
    });
  });
});

test('destroych', function (t) {
  t.plan(2);
  var id;
  var r1 = request({ url: 'http://localhost:6767' });
  r1.pipe(ssejson.parse()).once('data', function (data) {
    id = data.id;
    var r2 = request({ url: 'http://localhost:6767/' + data.id });
    r2.pipe(ssejson.parse()).once('data', function (data) {
      r2.on('end', function () {
        t.not(r1._ended, true);
        r1.on('end', function () {
          r1 = request({ url: 'http://localhost:6767/' + id });
          r1.on('response', function (res) {
            t.is(res.statusCode, 404);
            r1.abort();
          });
        });
        r1.abort();
      });
      r2.abort();
    });
  });
});

test('broadcast', function (t) {
  t.plan(1);
  var id;
  var expected = 'with a taste of ur lips im on a ride';
  var r1 = request({ url: 'http://localhost:6767' });
  r1.pipe(ssejson.parse()).once('data', function (data) {
    id = data.id;
    var r2 = request({ url: 'http://localhost:6767/' + data.id });
    r2.pipe(ssejson.parse()).on('data', function (data) {
      var r3 = request.post({ url: 'http://localhost:6767/' + data.id, 
                              form: { data: expected } })
      if (!data.id) {
        t.is(data, expected);
        r1.abort();
        r2.abort();
        r3.abort();
      }
    });
  });
});

test('cleanup', function (t) {
  server.close(function () { t.end() });
});