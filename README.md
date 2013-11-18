titanium-connection-test
========================

Runs a series of tests that attempts to connect to TLS secured web locations used by Appcelerator products to test if
proxies or other networking systems are interfering with connections to Appcelerator's endpoints.

## Installing

To install the script:

```
npm install -g git://github.com/appcelerator/titanium-connection-test.git
```

You may need to run this command as sudo on POSIX systems

## Running

To run the script:

```
titanium-connection-test
```

### Specifying a proxy

To specify an explicit proxy:

```
titanium-connection-test -p [proxy url]
```

The proxy url should be of the form "http://my.proxy.net:8080"

### Specifying a root certificate

If your proxy is SSL secured, you may need to specify a root CA certificate if the proxy's certificate is not trusted:

```
titanium-connection-test -c [path/to/certificate]
```

Certificates should be pem encoded

### Lenient handling of SSL errors

If you are still getting SSL certificate errors after specyfing a proxy and/or root certificate, then you may need
to disable SSL certificate errors entirely:

```
titanium-connection-test -l
```

This will ignore ALL SSL errors and is not recommended unless there is no other option

## Interpreting the results

The script will report if there were any issues connecting to the endpoints using various connection techniques. For
reference, the Titanium CLI uses the request module for its connections. If all endpoints are failing, this indicates
that there is probably a problem with the CLI configuration. If some endpoints are failing, but not others, this probably
indicates an issue with the proxy configuration. Consult your proxy documentation and configuration for details.

## License

This project is open source and provided under the Apache Public License
(version 2). Please make sure you see the `LICENSE` file included in this
distribution for more details on the license.  Also, please take notice of the
privacy notice at the end of the file.

#### (C) Copyright 2012-2013, [Appcelerator](http://www.appcelerator.com/) Inc. All Rights Reserved.
