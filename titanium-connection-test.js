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
	exec = require('child_process').exec,
	os = require('os'),

	uris = [
		'https://www.google.com',
		'https://github.com',
		'https://dashboard.appcelerator.com',
		'https://appctest-2.appcelerator.com',
		'https://www.appcelerator.com',
		'https://api.appcelerator.net',
		'https://api.cloud.appcelerator.com',
		'https://developer.appcelerator.com',
		'https://my.appcelerator.com',
		'https://preview.appcelerator.com',
		'https://studio.appcelerator.com'
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

/**
 * Looks for proxy settings in some common places like ENV vars, Mac's networksetup
 */
function gatherProxySettings() {
	console.log('\nSniffing proxy settings in environment...');
	var found = false;

	if (process.env['http_proxy'] != undefined) {
		console.log("http_proxy=" + process.env['http_proxy']);
		found = true;
	}
	if (process.env['https_proxy'] != undefined) {
		console.log("https_proxy=" + process.env['https_proxy']);
		found = true;
	}
	if (os.platform == 'darwin') {
		networkservices = ['Ethernet', 'Wi-Fi'];
		for(var i = 1; i < networkservices.length; i++)
		{
		   	exec("networksetup -getwebproxy \"" + networkservices[i] + "\"", function (error2, stdout2, stderr2) {
		   		if (stdout2.indexOf("Enabled: No") == -1) {
					console.log("HTTP Proxy settings found for " + networkservices[i]);
					console.log(stdout2);
					found = true;
				}
			});
			exec("networksetup -getsecurewebproxy \"" + networkservices[i] + "\"", function (error2, stdout2, stderr2) {
				if (stdout2.indexOf("Enabled: No") == -1) {
					console.log("HTTPS Proxy settings found for " + networkservices[i]);
					console.log(stdout2);
					found = true;
				}
			});
		}
	}

	if (!found) {
		console.log('Found no proxy settings in common locations.'.cyan)
	}
}

function runEndpointTest() {
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
						ca: cert,
						rejectUnauthorized: strict
					};
				} else {
					parsedUri = url.parse(uri);
					options = {
						host: parsedUri.hostname,
						port: parsedUri.port,
						path: parsedUri.path,
						ca: cert,
						rejectUnauthorized: strict
					};
				}
				(proxy && parsedProxy.protocol == 'http:' ? http : https).get(options, function () {
					console.log('  The raw HTTP module finished successfully'.green);
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
					ca: cert,
					rejectUnauthorized: strict
				}, function (error) {
					if (error) {
						console.error(('  The request module failed. ' + error).red);
					} else {
						console.log('  The request module finished successfully'.green);
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
					ca: cert,
					rejectUnauthorized: strict
				}, function () {
					console.log('  The tunnel module finished successfully'.green);
					next();
				}).on('error', function (error) {
					console.error(('  The tunnel module failed. ' + error).red);
					next();
				});
			}

		], runEndpointTest);
	} else {
		console.log('\nFinished testing endpoints');
		runLoginTest();
		runcURLTest();
	}
}

function runcURLTest() {
	exec("curl -d \"un=unit_tests@aptana.com&pw=unittest&mid=studio\" https://api.appcelerator.net/p/v1/sso-login", function (error, stdout, stderr) {
		console.log('\nTesting logging in against api.appcelerator.net using cURL')
		result = JSON.parse(stdout)
		console.log(result.success ? "Successful".green : "Failed".red);
	});

	exec("curl -d \"username=unit_tests@aptana.com&password=unittest&from=studio\" https://dashboard.appcelerator.com/api/v1/auth/login", function (error, stdout, stderr) {
		console.log('\nTesting logging in against dashboard.appcelerator.com using cURL')
		result = JSON.parse(stdout)
		console.log(result.success ? "Successful".green : "Failed".red);
	});
}
function runLoginTest() {
	var javaVersion = "Unknown";
	exec("java -version 1>&2", function (error, stdout, stderr) {
		javaVersion = stderr;
	});

	var parsedProxy;
	if (proxy) {
		parsedProxy = url.parse(proxy);
	}

	var command = "java ";
	var hiddenText;
	if (parsedProxy) {
		var scheme = (parsedProxy.protocol == 'http:') ? "http" : "https";
		command += "-D" + scheme + ".proxyHost=" + parsedProxy.hostname + " ";
		command += "-D" + scheme + ".proxyPort=" + parsedProxy.port + " ";
		var auth = parsedProxy.auth;
		if (auth) {
			var array = auth.split(":");
			var username = array[0];
			var password = array[1];
			command += "-D" + scheme + ".proxyUser=" + username + " ";
			command += "-D" + scheme + ".proxyPassword=" + password + " ";
			hiddenText = password;
		}
	}
	command += "-jar lib/dashboard-login-1.0.0.jar";
	exec(command, function (error, stdout, stderr) {
		console.log('\nTesting logging in against dashboard.appcelerator.com using Java');
		console.log(javaVersion.cyan);
		console.log('Running command: ' + (hiddenText ? command.replace(hiddenText, "********") : command));
		console.error(stderr.red);
		// Spit out the first line of stdout which contains http response code, then parse the rest as JSON and get success property
		firstLine = stdout.split('\n')[0];
		console.log(firstLine);
		result = JSON.parse(stdout.substr(stdout.indexOf("\n") + 1));
		console.log(result.success ? "Successful".green : "Failed".red);
		process.exit();
	});
}

gatherProxySettings();
console.log('\nRunning Endpoint Tests');
runEndpointTest();

