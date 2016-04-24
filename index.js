'use strict';
var io = require('socket.io');
var EventEmitter = require('events');

// Base Actor Model 
class Actor extends EventEmitter {
//   private _id; // the unique id
//   private _dispatcher;
//   private _registry;

  constructor (data) {
    // register self to the registry
    // dispatcher will find this object from registry
	this._data = data;
  }

  // save state for later use
  serialize () {
	return this._data;
  }
  
  // do some cleaning jobs here
  dispose () {
	  
  }

  // send events to the delegator in clients
  emit (eventName, args) {
	  this._dispatcher.proxyEvent(this, eventName, args); 
  }
  
  pid(){
	  return [this.getClassName(), this._id];
  }
}

// central registry
// should always be passive
class Registry {
	constructor(){
		this._factories = {}
		this._registry = {}
	}
	
	static getInstance(){
		if(!this._instance){
			this._instance = new Registry();
		}
		return this._instance;
	}
	
	// register a singleton
	register (name, object) {
		this._registry[name] = object;
	}
	
	// register a factory for a type object
	registerFactory(typename, factory){
		this.factorie[typename] = factory;
	}
	
	
	
	// find corresponding actor 
	resolve(pid){
		if( this._registry[pid] ){
			return this._registry[pid];
		} else {
			if (this._registry[pid.type][pid.id]) {
				return this._registry[pid.type][pid.id];
			} else {
				if (this._factories[pid.type]){
					var actor = this._factories[pid.type](pid);
					this._registry[pid.type][pid.id] = actor;
				}
			}
		}
	}
	
	
	// remove actor from registry
	unregister(pid){
		
	}
}


// Dispatcher for each socket
class Dispatcher extends EventEmitter {
	// private socket; // Socket.io socket
	
	constructor (socket) {
		super();
		this.socket = socket;
		var registry = Registry.getInstance();
		
		socket.on('call', (requestId, objid, method, args) => {
			var obj = registry.resolve(objid);
			if(typeof obj[method] == 'function'){
				if(! (args instanceof Array)){
					args = [args];
				}
				try {
					var r = obj[method].apply(obj, args);
				} catch (e) {
					socket.emit('error', requestId, e);
					return;
				}
				
				if(r instanceof Promise){
					r.then(function(data){
						socket.emit('result', requestId, data);
					}).catch(function(err){
						socket.emit('error', requestId, err);
					});
				} else {
					socket.emit('result', requestId, r);
				}
			} else {
				socket.emit('error', requestId, 'no such[method]');
			}
		});
	}
	
	proxyEvent (origin, eventName, args) {
		this.socket.emit('event', origin.pid(), eventName, args);
	}
}

"function ${} () {}; ${}.prototype.${}"
/// interface ObjectId { type:string; id:string; }

const express = require('express');

var Test = {
	test: function(num){
		console.log("test", num);
		
		return 100;
	}
}

function start(){
  var app = express();
  var server = require('http').Server(app);
  app.use(express.static('public'));
  var io = require('socket.io')(server);
  var port = 8080;
  
  server.listen(port);
  io.on('connection', function(socket){
	  var dispatcher = new Dispatcher(socket);
  });
}
var registry = Registry.getInstance();
registry.register('test', Test);
start();