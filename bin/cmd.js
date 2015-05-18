#!/usr/bin/env node

var http = require('http');
var handle = require('..');
var alloc = require('tcp-bind');
var argv = require('yargs')

  .usage('usage: $0 {options}')

  .help('help')
  .version(require('../package.json').version + '\n', 'version')

  .alias('help', 'h')
  .alias('version', 'V')
  .alias('uid', 'u')
  .alias('gid', 'g')
  .alias('port', 'p')

  .describe('help', 'show this message')
  .describe('version', 'show version number')
  .describe('port', 'listen for connections on this port')
  .describe('uid', 'drop permissions to this uid')
  .describe('gid', 'drop permissions to this gid')

  .default('port', require('is-root')() ? 80 : 5000)

  .argv;

var server = handle({ maxBroadcasts: 0 });

if (undefined !== argv.gid) process.setgid(argv.gid);
if (undefined !== argv.uid) process.setuid(argv.uid);

server.listen({ fd: alloc(argv.port) }, function () {
  console.log('listening on :' + server.address().port);
});