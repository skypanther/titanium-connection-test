#!/usr/bin/env node
/*
 * Copyright (c) 2009-2013 by Appcelerator, Inc. All Rights Reserved
 *
 * This file runs through a variety of SSL connections to see which ones fail and which one succeed using a variety of
 * different mechanisms
 */

var async = require('async'),
	url = require('url'),
	commander = require('commander'),
	fs = require('fs'),

	https = require('https'),
	http = require('http'),
	request = require('request'),
	tunnel = require('tunnel'),

	uris = [
		'https://www.google.com',
		'https://github.com',
		'https://www.appcelerator.com',
		'https://www.aptana.com',
		'https://api.appcelerator.net',
		'https://api.cloud.appcelerator.com',
		'https://developer.appcelerator.com',
		'https://my.appcelerator.com',
		'https://preview.appcelerator.com',
		'https://studio.appcelerator.com',
		'https://www.appcelerator.com'
	],
	proxy,
	cert,
	strict;
require('colors');

commander
	.version(require('./package.json').version)
	.option('-p, --proxy [url]', 'The proxy to use, e.g. "http://myproxy.com:8080"')
	.option('-c, --cert [path]', 'The certificate to use')
	.option('-l, --lenient', 'Do not fail on SSL errors (default false)')
	.parse(process.argv);
proxy = commander.proxy;
cert = commander.cert;
strict = !commander.lenient;
if (cert) {
	cert = fs.readFileSync(cert);
}

//Get list of URLs from Michael

console.log(proxy ? '\nUsing proxy ' + proxy : '\nNot using a proxy');
console.log(cert ? 'Using certificate ' + cert : 'Not using a certificate');
console.log(strict ? 'Failing on SSL errors' : 'Ignoring SSL errors');
console.log('\nRunning Tests');

function runTest() {
	var uri = uris.shift();
	if (uri) {
		console.log('\nTesting endpoint ' + uri);
		async.parallel([

			// raw HTTP client
			function (next) {
				var options,
					parsedProxy,
					parsedUri;
				if (proxy) {
					parsedProxy = url.parse(proxy);
					options = {
						host: parsedProxy.hostname,
						port: parsedProxy.port,
						path: uri,
						headers: {
							Host: url.parse(uri).hostname
						},
						cert: cert,
						rejectUnauthorized: strict
					};
				} else {
					parsedUri = url.parse(uri);
					options = {
						host: parsedUri.hostname,
						port: parsedUri.port,
						path: parsedUri.path,
						cert: cert,
						rejectUnauthorized: strict
					};
				}
				(proxy && parsedProxy.protocol == 'http:' ? http : https).get(options, function () {
					console.log('  The raw HTTP module finished successfully');
					next();
				}).on('error', function (error) {
					console.error(('  The raw HTTP module failed. ' + error).red);
					next();
				});
			},

			// request module
			function (next) {
				request({
					uri: uri,
					proxy: proxy,
					cert: cert,
					rejectUnauthorized: strict
				}, function (error) {
					if (error) {
						console.error(('  The request module failed. ' + error).red);
					} else {
						console.log('  The request module finished successfully');
					}
					next();
				});
			},

			// tunnel module
			function (next) {
				var parsedProxy,
					parsedHost = url.parse(uri),
					tunnelingAgent;
				if (proxy) {
					parsedProxy = url.parse(proxy);
					tunnelingAgent = tunnel[parsedProxy.protocol == 'http:' ? 'httpsOverHttp' : 'httpsOverHttps']({
						proxy: {
							host: parsedProxy.hostname,
							port: parsedProxy.port,
						}
					});
				}
				https.get({
					host: parsedHost.hostname,
					port: parsedHost.port,
					agent: tunnelingAgent,
					cert: cert,
					rejectUnauthorized: strict
				}, function () {
					console.log('  The tunnel module finished successfully');
					next();
				}).on('error', function (error) {
					console.error(('  The tunnel module failed. ' + error).red);
					next();
				});
			}

		], runTest);
	} else {
		console.log('\nAll tests finished\n');
		process.exit();
	}
}
runTest();