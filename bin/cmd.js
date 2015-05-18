#!/usr/bin/env node

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
  alias: {
    port: 'p',
    host: 'h',
    'max-broadcasts': 'm'
  },
  default: {
    port: process.env.PORT || 80
  }
});

var max = Number(argv['max-broadcasts']) || 0;
var server = require('../')({maxBroadcasts: max});

server.on('subscribe', function (channel) {
  console.log('subscribe: %s', channel);
});

server.on('broadcast', function (channel, message) {
  console.log('broadcast: %s (%d)', channel, message.length);
});

server.listen(argv.port, function () {
  console.log('listening on: ' + server.address().port);
});