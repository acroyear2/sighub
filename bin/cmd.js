#!/usr/bin/env node

var http = require('http');
var handle = require('..');
var alloc = require('tcp-bind');
var minimist = require('minimist');

var argv = minimist(process.argv.slice(2), {
  alias: {
    port: 'p',
    host: 'h',
    'max-broadcasts': 'm'
  },
  default: {
    port: require('is-root')() ? 80 : 5000
  }
}), fd = alloc(argv.port);

var max = Number(argv['max-broadcasts']) || 0;
var server = handle({ maxBroadcasts: max });

server.on('subscribe', function (channel) {
  console.log('subscribe: %s', channel);
});

server.on('broadcast', function (channel, message) {
  console.log('broadcast: %s (%d)', channel, message.length);
});

server.listen({ fd: fd }, function () {
  console.log('listening on: ' + server.address().port);
});