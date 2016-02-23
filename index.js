//Lets define a port we want to listen to
const PORT=8080; 

var chokidar = require('chokidar');
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var fs = require('fs');
var Promise = require('es6-promise').Promise;

var deleteFolder = function (path) {
    return new Promise(function(){

        fs.stat(path, function(err, stats) {
            if (stats && stats.isDirectory()) {
                fs.readdir(path, function(err, files) {
                    if (err) {
                        reject(err);
                        return
                    }
                    return Promise.all(files.map(function(file) {
                        return path + '/' + file
                    }).forEach(deleteFolder)).then(function() {
                        fs.unlink(path, function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    });
                });         
            }
        });   



    })



    fs.readdirSync(path).forEach(function (file, index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) {
            deleteFolder(curPath);
        }
        else {
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
};
deleteFolder("./build")

var copyFiles = function(path) {
    fs.stat(path, function(err, stats) {
        if (stats && stats.isDirectory()) {
            fs.mkdir(path.replace('src', 'build'), function(err) {
                // ignore
            });
            fs.readdir(path, function(err, files) {
                if (err) {
                    return
                }
                files.map(function(file) {
                    return path + '/' + file
                }).forEach(copyFiles);
            });
        }
        else {
            console.log('Processing', path)
            fs.createReadStream(path).pipe(fs.createWriteStream(path.replace('src/', 'build/')));        
        }
    });    
};
copyFiles('./src');


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

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});

