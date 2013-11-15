#!/usr/bin/env node
/*
 * Copyright (c) 2009-2013 by Appcelerator, Inc. All Rights Reserved
 *
 * This file runs through a variety of SSL connections to see which ones fail and which one succeed using a variety of
 * different mechanisms
 */

var async = require('async'),
	request = require('request'),

	proxy = process.argv[2],

	urls = [
		{
			uri: 'https://www.google.com',
			method: 'GET',
			proxy: proxy,
			expectedResponseCode: 200
		},
		{
			uri: 'https://www.appcelerator.com',
			method: 'GET',
			proxy: proxy,
			expectedResponseCode: 200
		},
		{
			uri: 'https://api.appcelerator.net/p/v1/sso-login',
			method: 'POST',
			proxy: proxy,
			expectedResponseCode: 400
		},
		{
			uri: 'https://api.appcelerator.net/p/v1/sso-logout',
			method: 'POST',
			proxy: proxy,
			expectedResponseCode: 400
		},
		{
			uri: 'https://my.appcelerator.com/',
			method: 'POST',
			proxy: proxy,
			expectedResponseCode: 302
		}
	];

if (proxy) {
	console.log('\nRunning tests with proxy ' + proxy);
} else {
	console.log('\nRunning tests without a proxy');
}

function runTest() {
	var url = urls.shift();
	if (url) {
		console.log('\nTesting endpoint ' + url.uri);
		async.series([

			// request module
			function (next) {
				console.log('Testing request module');
				request(url, function (error, response) {
					if (error) {
						console.log('The request module failed for ' + url.uri + '\n\t' + error);
					} else {
						console.log('The request module finished for ' + url.uri + ' with status code ' + response.statusCode +
							' (expected ' + url.expectedResponseCode + ')');
					}
					next();
				});
			}
		], runTest);
	} else {
		console.log('\nAll tests finished\n');
	}
}
runTest();