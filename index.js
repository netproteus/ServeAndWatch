//Lets define a port we want to listen to
const PORT=8080;

var chokidar = require('chokidar');
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var fs = require('fs');
var Promise = require('es6-promise').Promise;

var pWrap = function(fn, ctx) {
    return function() {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function(resolve, reject) {
            args.push(function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                var cbArgs = Array.prototype.slice.call(arguments, 1);
                if (cbArgs.length === 1) {
                    resolve.apply(null, cbArgs);
                }
                else {
                    resolve.call(null, cbArgs);
                }

            });
            fn.apply(ctx, args);
        });
    };
};

var deleteFiles = function (path) {
    path = path.replace("src", "build")
    console.log('Deleting', path)

    return pWrap(fs.stat)(path).then(function(stats) {
        if (stats) {
            if (stats.isDirectory()) {
                return pWrap(fs.readdir)(path).then(function(files) {
                    return Promise.all(files.map(function(file) {
                        return path + '/' + file
                    }).map(deleteFiles));
                }).then(function() {
                    return pWrap(fs.rmdir)(path);
                })
            }
            else {
                return pWrap(fs.unlink)(path);
            }
        }
        return result;
    }, function(err) {
        if (err.code === 'ENOENT' && err.path === './build') {
            // Ignore
            return;
        }
        throw err;
    })
};

var copyFiles = function(path) {
    console.log('Copying', path)
    pWrap(fs.stat)(path).then(function(stats) {
        if (stats) {
            if (stats.isDirectory()) {
                return pWrap(fs.mkdir)(path.replace('src', 'build')).then(function() {
                    return pWrap(fs.readdir)(path).then(function(files) {
                        return Promise.all(files.map(function(file){
                            return path + '/' + file;
                        }).map(copyFiles))
                    })
                });
            }
            else {
                return new Promise(function(resolve, reject) {
                    var stream = fs.createReadStream(path).pipe(
                        fs.createWriteStream(path.replace('src/', 'build/'))
                    );
                    stream.on('finish', resolve);
                    stream.on('errror', reject);
                });

            }
        }
    })
};

deleteFiles("./build").then(function() {
    return copyFiles('./src');
}).then(function() {

    var serve = serveStatic("./build");

    var server = http.createServer(function(req, res) {
      var done = finalhandler(req, res);
      serve(req, res, done);
    });

    var watcher = chokidar.watch('./src', {
        persistent: true
    });

    watcher.on('add', copyFiles);
    watcher.on('addDir', copyFiles);
    watcher.on('change', copyFiles);
    watcher.on('unlink', deleteFiles);
    watcher.on('unlinkDir', deleteFiles);

    //Lets start our server
    server.listen(PORT, function(){
        //Callback triggered when server is successfully listening. Hurray!
        console.log("Server listening on: http://localhost:%s", PORT);
    });


}).catch(function(err) {
    console.log(err, err.stack);
});



