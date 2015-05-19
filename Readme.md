# sighub

aids establishing communications between remote endpoints.

`sighub` is originally forked from [signalhub](https://github.com/mafintosh/signalhub) and inspired by [cat-lobby](https://github.com/maxogden/cat-lobby). It combines bits and pieces of both, but is slightly different.

# example

```js
var http = require('http');
var sighub = require('sighub');

var server = http.createServer(sighub());
server.listen(5000, function () {
  console.log('listening on :' + server.address().port);
});
```

# api

## var hub = sighub(opts);

Returns a handle `hub` that can be set to either a [http](https://nodejs.org/api/http.html) server or socket.

The optional `opts` object can have these properties:

- `maxBroadcasts` is the maximum number of connections a single channel can have. `(default: Infinity)`
- `maxSize` is the size limit of a single broadcast message in bytes. `(default: 65536)`

# http api

Following routes are installed when you attach a sighub handle to your server:

## POST /subscribe

Creates a new channel and starts a [Server-Sent Events (SSE)](http://dev.w3.org/html5/eventsource/) stream to deliver messages sent to this channel.

- Channel id is provided in the [Link header](http://tools.ietf.org/html/rfc5988).
- `Accept` header must be present and must contain `text/event-stream` as per the SSE spec.

```
λ ~ curl -H "Accept: text/event-stream" -X POST -I "localhost:5000/subscribe"
HTTP/1.1 201 Created
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Link: <https://localhost:5000/subscribe/b1acb85ff49995b959afc00ca3e89c01>; rel="channel"
```

## GET /subscribe/:id

Starts a [Server-Sent Events (SSE)](http://dev.w3.org/html5/eventsource/) stream to deliver messages sent to the channel specified by the `id`.

```
λ ~ curl -H "Accept: text/event-stream" \
"https://localhost:5000/subscribe/b1acb85ff49995b959afc00ca3e89c01"
```

## POST /broadcast/:id

Sends a broadcast message to all connected clients to the channel specified by the `id`.

```
λ ~ echo '{"foo": "bar"}' | curl -X POST -v -d @- \
"http://localhost:5000/broadcast/b1acb85ff49995b959afc00ca3e89c01"
```

# usage

```
usage: sighub {options}

Options:
  --help, -h     show this message
  --version, -V  show version number
  --port, -p     listen for connections on this port
  --uid, -u      drop permissions to this uid
  --gid, -g      drop permissions to this gid
```

# license

mit
