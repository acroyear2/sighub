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

## POST /create

## GET /subscribe/:id

## POST /broadcast/:id

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
