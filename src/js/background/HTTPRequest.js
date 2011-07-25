/**
 * HTTP Request
 *
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */

/**
 * @constructor
 * @extends twic.Error
 * @param {number} code Error code
 * @param {XMLHttpRequest} req Request
 */
twic.ResponseError = function(code, req) {
	this.request = req;

	twic.Error.call(this, code);
};

goog.inherits(twic.ResponseError, twic.Error);

/** @const */ twic.ResponseError.UNKNOWN      = 0;
/** @const */ twic.ResponseError.UNAUTHORIZED = 1;
/** @const */ twic.ResponseError.TIMEOUT      = 2;

/**
 * @constructor
 * @param {string} method Method (GET, POST)
 * @param {string} url Url
 */
twic.HTTPRequest = function(method, url) {
	this.method = method;
	this.url = url;
	this.requestHeaders = {};
	this.data = {};
};

/**
 * @param {string} data Data
 * @return {Object} Parsed object
 */
twic.HTTPRequest.queryStringToObject = function(data) {
	var
		result = { },
		tmp,
		r = /([^&=]+)=?([^&]*)/g;

	while (true) {
		tmp = r.exec(data);

		if (!tmp) {
			break;
		}

		result[tmp[1]] = tmp[2];
	}

	return result;
};

/**
 * Get all the data
 * @return {Array.<string>}
 */
twic.HTTPRequest.prototype.getData = function() {
	var
		self = this,
		key = '',
		data = [];

	for (key in self.data) {
		data.push(self.encodeString(key) + '=' + self.encodeString(self.data[key]));
	}

	return data;
};

/**
 * Static function to encode the string
 * @param {string} str String
 * @return {string}
 */
twic.HTTPRequest.prototype.encodeString = function(str) {
	return encodeURIComponent(str)
		.replace(/\!/g, '%21')
		.replace(/\*/g, '%2A')
		.replace(/'/g, '%27')
		.replace(/\(/g, '%28')
		.replace(/\)/g, '%29');
};

/**
 * Set request custom header
 * @param {string} key Key
 * @param {string} value Value
 */
twic.HTTPRequest.prototype.setHeader = function(key, value) {
  this.requestHeaders[key] = value;
};

/**
 * Set request POST data
 * @param {string} key Key
 * @param {string|number} value Value
 */
twic.HTTPRequest.prototype.setRequestData = function(key, value) {
	this.data[key] = value;
};

/**
 * Send the request
 * @param {function(?twic.ResponseError, XMLHttpRequest=)} callback Callback
 * todo send method can't be shortened by Closure Compiler, don't know why
 */
twic.HTTPRequest.prototype.send = function(callback) {
	var
		self = this,
		data = self.getData(),
		key = '';

	var req = new XMLHttpRequest();

	req.onreadystatechange = function() {
		var req = this;

		if (4 === req.readyState) {
			if (401 === req.status) {
				twic.debug.groupCollapsed(req);
				twic.debug.error('Unauthorized');
				twic.debug.groupEnd();

				callback(new twic.ResponseError(twic.ResponseError.UNAUTHORIZED, req));
			} else
			if ('' === req.responseText) {
				twic.debug.groupCollapsed(req);
				twic.debug.error('Empty reply');
				twic.debug.groupEnd();

				callback(new twic.ResponseError(twic.ResponseError.TIMEOUT, req));
			} else
			if (200 === req.status) {
				twic.debug.groupCollapsed('http request to ' + self.url + ' finished');
				try {
					twic.debug.dir(JSON.parse(req.responseText));
				} catch(e) {
					twic.debug.info(req.responseText);
				}
				twic.debug.groupEnd();

				callback(null, req);
			} else {
				twic.debug.groupCollapsed(req);
				twic.debug.error('Unknown status');
				twic.debug.log(req.status);
				twic.debug.log(req.responseText);
				twic.debug.groupEnd();

				callback(new twic.ResponseError(twic.ResponseError.UNKNOWN, req));
			}
		}
	};

	req.open(self.method, self.url + (self.method === 'GET' ? '?' + data.join('&') : ''));

	for (key in self.requestHeaders) {
		req.setRequestHeader(key, self.requestHeaders[key]);
	}

	if (self.method === 'GET') {
		req.send();
	} else {
		req.send(data.join('&'));
	}
};

