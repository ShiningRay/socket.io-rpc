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
	super();
	this._data = data;
	Actor.dispatcher.register(this);
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
	//   this.emit(eventName, args);
	  this._dispatcher.proxyEvent(this, eventName, args); 
  }
  
  pid () {
	  return this._pid;
  }
  
  getClassName(){
	  return this.constructor.name;
  }
}


var shortid = require('shortid');
// central registry
// should always be passive
class Registry {
	constructor(dispatcher){
		this._factories = {}
		this._registry = {}
		this._dispatcher = dispatcher;
	}
	
	// register a singleton
	register (name, object) {
		if(typeof object == 'undefined'){
			object = name;
			name = shortid.generate();
		}
		this._registry[name] = object;
		
		object._dispatcher = this._dispatcher;
		object._pid = name;
	}
	
	// find corresponding actor 
	resolve(pid){
		if( this._registry[pid] ){
			return this._registry[pid];
		}
	}
	
	// remove actor from registry
	unregister(pid){
		delete this._registry[pid];
	}
}


// Dispatcher for each socket
class Dispatcher extends EventEmitter {
	// private socket; // Socket.io socket
	
	constructor (server) {
		super();
		this.server = server;
		this.registry = new Registry(this);
		Actor.dispatcher = this;
		server.on('connection', this.handleConnection.bind(this));
	}
	
	register(name, object) {
		return this.registry.register(name, object);
	}
	
	handleConnection (socket) {
		socket.on('call', (requestId, objid, method, args) => {
			var obj = this.registry.resolve(objid);
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

class Car extends Actor {
	weight () {
		return this._data.weight;
	}
}

class CarController extends Actor {
	find(id){
		var car = new Car({weight: 100});
		return Promise.resolve(car.pid());
	}
}

function start(){
  var app = express();
  var server = require('http').Server(app);
  app.use(express.static('public'));
  var io = require('socket.io')(server);
  var port = 8080;
  
  server.listen(port);
  var dispatcher = new Dispatcher(io);
  dispatcher.register('car', new CarController());
}
start();