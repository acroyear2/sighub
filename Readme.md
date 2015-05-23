# sighub

aids establishing communications between remote endpoints.

Originally forked from [signalhub](https://github.com/mafintosh/signalhub) and inspired by [cat-lobby](https://github.com/maxogden/cat-lobby). This one uses [koa](https://github.com/koajs/koa), generates channel ids on the server side and drops all connections when initiator leaves a channel.

# api

## var hub = sighub();

Returns a [koa](https://github.com/koajs/koa) app.

```js
require('sighub')().listen(5000);
```

# http api

## GET /

Creates a new channel and starts a [Server-Sent Events (SSE)](http://dev.w3.org/html5/eventsource/) stream to deliver messages sent to this channel.

- `Accept` header must be present and must contain `text/event-stream` as per the SSE spec.
- Immediately pushes id of the channel.
- When initiator leaves, all other subscribers are disconnected.

## GET /:id

Starts a [Server-Sent Events (SSE)](http://dev.w3.org/html5/eventsource/) stream to deliver messages sent to the channel specified by the `id`.

```
curl -H "Accept: text/event-stream" \
  "http://localhost:5000/6d1bab5aecf38a8432dae2b92e414a02
```

## POST /:id

Sends a broadcast message to all connected clients to the channel specified by the `id`.

- message must be in `data` parameter. It can be either a json or a form.

```
curl -H "Content-Type: application/json" -X POST \
  -d '{"data": {"boom": "boom"} }' \
  "http://localhost:5000/6d1bab5aecf38a8432dae2b92e414a02"
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
