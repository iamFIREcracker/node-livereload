// Generated by CoffeeScript 1.3.3
(function() {
  var Server, defaultExclusions, defaultExts, defaultPort, fs, http, path, protocol_version, url, ws;

  fs = require('fs');

  path = require('path');

  ws = require('websocket.io');

  http = require('http');

  url = require('url');

  protocol_version = '1.6';

  defaultPort = 35729;

  defaultExts = ['html', 'css', 'js', 'png', 'gif', 'jpg', 'php', 'php5', 'py', 'rb', 'erb', 'coffee'];

  defaultExclusions = [/\.git\//, /\.svn\//, /\.hg\//];

  Server = (function() {

    function Server(config) {
      var _base, _base1, _base2, _base3, _base4, _base5, _base6, _base7, _base8, _base9, _ref, _ref1, _ref10, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      this.config = config;
      if ((_ref = this.config) == null) {
        this.config = {};
      }
      if ((_ref1 = (_base = this.config).version) == null) {
        _base.version = protocol_version;
      }
      if ((_ref2 = (_base1 = this.config).port) == null) {
        _base1.port = defaultPort;
      }
      if ((_ref3 = (_base2 = this.config).exts) == null) {
        _base2.exts = [];
      }
      if ((_ref4 = (_base3 = this.config).exclusions) == null) {
        _base3.exclusions = [];
      }
      this.config.exts = this.config.exts.concat(defaultExts);
      this.config.exclusions = this.config.exclusions.concat(defaultExclusions);
      if ((_ref5 = (_base4 = this.config).applyJSLive) == null) {
        _base4.applyJSLive = false;
      }
      if ((_ref6 = (_base5 = this.config).applyCSSLive) == null) {
        _base5.applyCSSLive = true;
      }
      if ((_ref7 = (_base6 = this.config).applyImgLive) == null) {
        _base6.applyImgLive = true;
      }
      if ((_ref8 = (_base7 = this.config).originalPath) == null) {
        _base7.originalPath = '';
      }
      if ((_ref9 = (_base8 = this.config).overrideURL) == null) {
        _base8.overrideURL = '';
      }
      if ((_ref10 = (_base9 = this.config).interval) == null) {
        _base9.interval = 1000;
      }
      this.sockets = [];
    }

    Server.prototype.listen = function() {
      this.debug("LiveReload is waiting for browser to connect.");
      if (this.config.server) {
        this.config.server.listen(this.config.port);
        this.server = ws.attach(this.config.server);
      } else {
        this.server = ws.listen(this.config.port);
      }
      this.server.on('connection', this.onConnection.bind(this));
      return this.server.on('close', this.onClose.bind(this));
    };

    Server.prototype.onConnection = function(socket) {
      var _this = this;
      this.debug("Browser connected.");
      socket.send("!!ver:" + this.config.version);
      socket.on('message', function(message) {
        return _this.debug("Browser URL: " + message);
      });
      socket.on('error', function(err) {
        return _this.debug("Error in client socket: " + err);
      });
      return this.sockets.push(socket);
    };

    Server.prototype.onClose = function(socket) {
      return this.debug("Browser disconnected.");
    };

    Server.prototype.walkTree = function(dirname, callback) {
      var exclusions, exts, walk;
      exts = this.config.exts;
      exclusions = this.config.exclusions;
      walk = function(dirname) {
        return fs.readdir(dirname, function(err, files) {
          if (err) {
            return callback(err);
          }
          return files.forEach(function(file) {
            var exclusion, filename, _i, _len;
            filename = path.join(dirname, file);
            for (_i = 0, _len = exclusions.length; _i < _len; _i++) {
              exclusion = exclusions[_i];
              if (filename.match(exclusion)) {
                return;
              }
            }
            return fs.stat(filename, function(err, stats) {
              var ext, _j, _len1, _results;
              if (!err && stats.isDirectory()) {
                return walk(filename);
              } else {
                _results = [];
                for (_j = 0, _len1 = exts.length; _j < _len1; _j++) {
                  ext = exts[_j];
                  if (!(filename.match("\." + ext + "$"))) {
                    continue;
                  }
                  callback(err, filename);
                  break;
                }
                return _results;
              }
            });
          });
        });
      };
      return walk(dirname, callback);
    };

    Server.prototype.watch = function(dirname) {
      var _this = this;
      return this.walkTree(dirname, function(err, filename) {
        if (err) {
          throw err;
        }
        return fs.watchFile(filename, {
          interval: _this.config.interval
        }, function(curr, prev) {
          if (curr.mtime > prev.mtime) {
            return _this.refresh(filename);
          }
        });
      });
    };

    Server.prototype.refresh = function(path) {
      var data, socket, _i, _len, _ref, _results;
      this.debug("Refresh: " + path);
      data = JSON.stringify([
        'refresh', {
          path: path,
          apply_js_live: this.config.applyJSLive,
          apply_css_live: this.config.applyCSSLive,
          apply_img_live: this.config.applyImgLive,
          original_path: this.config.originalPath,
          override_url: this.config.overrideURL
        }
      ]);
      _ref = this.sockets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        socket = _ref[_i];
        _results.push(socket.send(data));
      }
      return _results;
    };

    Server.prototype.debug = function(str) {
      if (this.config.debug) {
        return console.log("" + str + "\n");
      }
    };

    return Server;

  })();

  exports.createServer = function(config) {
    var app, server, _ref;
    if (config == null) {
      config = {};
    }
    app = http.createServer(function(req, res) {
      if (url.parse(req.url).pathname === '/livereload.js') {
        res.writeHead(200, {
          'Content-Type': 'text/javascript'
        });
        return res.end(fs.readFileSync(__dirname + '/../ext/livereload.js'));
      }
    });
    if ((_ref = config.server) == null) {
      config.server = app;
    }
    server = new Server(config);
    server.listen();
    return server;
  };

}).call(this);