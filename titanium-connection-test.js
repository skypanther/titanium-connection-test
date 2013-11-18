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
		{
			uri: 'https://www.google.com',
			expectedResponseCode: 200
		},
		{
			uri: 'https://github.com',
			expectedResponseCode: 200
		},
		{
			uri: 'https://www.appcelerator.com',
			expectedResponseCode: 200
		},
		{
			uri: 'https://api.appcelerator.net/p/v1/sso-login',
			expectedResponseCode: 400
		},
		{
			uri: 'https://api.appcelerator.net/p/v1/sso-logout',
			expectedResponseCode: 400
		},
		{
			uri: 'https://my.appcelerator.com/',
			expectedResponseCode: 302
		}
	],
	proxy,
	cert;

commander
	.version(require('./package.json').version)
	.option('-p, --proxy [url]', 'The proxy to use, e.g. "http://myproxy.com:8080"')
	.option('-c, --cert [path]', 'The certificate to use')
	.parse(process.argv);
proxy = commander.proxy;
cert = commander.cert;
if (cert) {
	cert = fs.readFileSync(cert);
}

if (proxy) {
	console.log('\nRunning tests with proxy ' + proxy);
} else {
	console.log('\nRunning tests without a proxy');
}

function runTest() {
	var uri = uris.shift();
	if (uri) {
		console.log('\nTesting endpoint ' + uri.uri);
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
						path: uri.uri,
						headers: {
							Host: url.parse(uri.uri).hostname
						},
						cert: cert
					};
				} else {
					parsedUri = url.parse(uri.uri);
					options = {
						host: parsedUri.hostname,
						port: parsedUri.port,
						path: parsedUri.path,
						cert: cert
					};
				}
				(proxy && parsedProxy.protocol == 'http:' ? http : https).get(options, function (response) {
					console.log('  The raw HTTP module finished for ' + uri.uri + ' with status code ' + response.statusCode +
						' (expected ' + uri.expectedResponseCode + ')');
					next();
				}).on('error', function (error) {
					console.log('  The raw HTTP module failed for ' + uri.uri + '\n\t' + error);
					next();
				});
			},

			// request module
			function (next) {
				request({
					uri: uri.uri,
					proxy: proxy,
					cert: cert
				}, function (error, response) {
					if (error) {
						console.log('  The request module failed for ' + uri.uri + '\n\t' + error);
					} else {
						console.log('  The request module finished for ' + uri.uri + ' with status code ' + response.statusCode +
							' (expected ' + uri.expectedResponseCode + ')');
					}
					next();
				});
			},

			// tunnel module
			function (next) {
				var parsedProxy,
					parsedHost = url.parse(uri.uri),
					tunnelingAgent;
				if (proxy) {
					parsedProxy = url.parse(proxy);
					tunnelingAgent = tunnel[parsedProxy.protocol == 'http:' ? 'httpsOverHttp' : 'httpsOverHttps']({
						proxy: {
							host: parsedProxy.hostname, // Defaults to 'localhost'
							port: parsedProxy.port, // Defaults to 80
						}
					});
				}
				https.get({
					host: parsedHost.hostname,
					port: parsedHost.port,
					agent: tunnelingAgent,
					cert: cert
				}, function (response) {
					console.log('  The tunnel module finished for ' + uri.uri + ' with status code ' + response.statusCode +
						' (expected ' + uri.expectedResponseCode + ')');
					next();
				}).on('error', function (error) {
					console.log('  The tunnel module failed for ' + uri.uri + '\n\t' + error);
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