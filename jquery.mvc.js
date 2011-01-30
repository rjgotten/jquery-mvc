/*!
 * jQuery MVC
 * A simple MVC framework for the jQuery JavaScript Library
 * http://github.com/rjgotten/jquery-mvc
 *
 * Copyright 2011, Ron Otten
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://github.com/rjgotten/jquery-mvc/licenses
 */
( function( $, undefined ) {

	// Make sure the jQuery.mvc namespace exists.
	$.mvc = $.mvc || {};
	
	/**
	 * Version indicator for the jQuery.mvc library.
	 * @type String
	 */
	$.mvc.version = "0.9.0";
	
	/**
	 * Creates a new jQuery.mvc module prototype with the given name. If the name includes
	 * a leading namespace (separated from the name by a dot), the prototype is stored at	 
	 * the location jQuery.mvc.<namespace>.<name> for further use.
	 * @param {String} name  The name of the new module prototype, which may include a
	 *                       leading dot separated namespace.
	 * @param {Object} base  The base module prototype from which to derive the new
	 *                       module prototype.
	 * @param {Object} proto The definition for the new module prototype.
	 * @return {Function} The constructor function for the new module prototype.
	 */
	$.mvc.module = function( name, base, proto ) {
		var fullname, namespace, baseObj, namespaceObj;

		// Resolve the module's name and namespace.
		fullname  = name.split( "." );
		name      = fullname[ 1 ] || fullname[ 0 ];
		namespace = fullname[ 0 ] === name ? "" : fullname[ 0 ];
		fullname  = fullname.join( "-" );

		// Create a new, uninitialized instance of the base MVC module and
		// deep copy its options onto the instance so they aren't shared
		// from the base prototype across multiple instances.
		baseObj = new base();	
		baseObj.options = $.extend( true, {}, baseObj.options );
				
		// Create the namespace for the new MVC module. This may be a temporary
		// object when no namespace was specified.
		namespaceObj = namespace
			? $.mvc[ namespace ] = $.mvc[ namespace ] || {} 
			: {};
			
		// Create a new constructor function. This has to be a new unique function
		// of which the prototype will be extended to create the new MVC module.
		namespaceObj[ name ] = function() {
			// Allow instantiation without initializing for simple inheritance
			if ( arguments.length ) {
				this._createModule.apply( this, arguments );				
			}
		};
		
		// Compose the complete prototype for the new MVC module.
		namespaceObj[ name ].prototype = $.extend( true, baseObj, {
			name        : name,
			namespace   : namespace,		
			base        : base.prototype,
			constructor : namespaceObj[ name ]
		}, proto );	
		
		// Add or replace the internal __super method where necessary.
		$.each( namespaceObj[ name ].prototype, function( name, fn ) {
			if ( name === "constructor" ) { return true; /* continue */ }
			
			var fnSuper = base.prototype[ name ];
			if ( fn !== fnSuper && $.isFunction( fn ) && $.isFunction( fnSuper ) ) {
				fn.__super = fnSuper;
			}
			
		});
		
		return namespaceObj[ name ];
	}


	/**
	 * @constructor
	 * Creates a new jQuery.mvc module.
	 * @param {String} name    The module's registered name.
	 * @param {Object} options A hash of options with which the module will
	 *                         be configured.
	 */
	$.mvc.Module = function( name, options ) {

		// Allow instantiation without initializing for simple inheritance
		if ( arguments.length > 0 ) {
			this._createModule.apply( this, arguments );
		}
	}

	$.mvc.Module.prototype = {
		/**
		 * The module's type name.
		 * @type String
		 */
		name: "module",		
				
		/**
		 * A hash of option values configuring the module.
		 * @type Object
		 */
		options: { },		
		
		/**
		 * Creates a new jQuery.mvc module.
		 * @param {String} name    The module's registered name.
		 * @param {Object} options A hash of options with which the module will
		 *                         be configured.
		 */
		_createModule: function( name, options ) {
			// The instance member reflects the instance name, while the prototype's
			// member reflects the type name.
			this.name = name;		
			this.options = $.extend( true, {}, this.options, options );			
		},

		/**
		 * Calls the 'super' version of the calling method in the module's base module.
		 * <p>
		 * The pattern relies on the arguments.callee and arguments.callee.caller properties
		 * to store a reference on a function to its 'super' function and to obtain a reference
		 * to the calling function, respectively. The result is a virtual function call that
		 * will in all situations correctly handle the chain of inheritance -and- is safe for
		 * use with reentrant callback functions.
		 * </p>
		 * <p>
		 * Correctness comes at the cost of execution speed: the use of arguments.callee and
		 * arguments.callee.caller is expensive in terms of limiting compiler optimizations.
		 * It would be a bad idea to make many repeated calls to _super, e.g. , by using it
		 * inside tight loops.
		 * </p>		 
		 * @param {*} ... A variable list of arguments to pass to the super method.
		 * @return {*} The return value of the super method call.
		 */
		_super: function( /* ... */ ) {
			var caller = arguments.callee.caller;			
			
			if ( caller && $.isFunction( caller.__super ) ) {
				return caller.__super.apply( this, arguments );
			} else {
				throw "_super: No super-implementation available for this function."
			}
		},
		 	
		/**
		 * Gets the name of the MVC module's registered instance.
		 * @returns {String} The instance's name.
		 */
		getName: function() { return this.name; },
		
		/**
		 * Broadcasts a notification to the jQuery.mvc manifold.
		 * @param {String} name The notification's name.
		 * @param {Object} body The notification's body or data.
		 */
		_notify: function( name, body ) {
			var notification = $.mvc.Notification( name, body );			
			$.mvc.notifier.notify( notification );			
		}		
	}

})( jQuery );


/** jQuery.mvc.model.js **/ 

( function( $, undefined ) {

	var proxyMap = {}, proxyGuid = 0;

	/**
	 * The static model singleton of the jQuery.mvc manifold.
	 * 
	 * <p>The model assumes these responsibilities:</p>
	 * <ul>
	 * <li>Maintaining a cache of proxy instances.</li>
	 * <li>Providing methods for registering, retrieving, and removing proxies.</li>
	 * <li>Notifiying proxies when they are registered or removed.</li>
	 * </ul>	
	 */
	$.mvc.model = {
	
		/**
		 * Checks if a proxy has been registered with the model under the given name.
		 * @param {String} The name of the proxy.
		 * @return {Boolean} Whether a proxy is currently registered under the given name.
		 */
		has: function( name ) {
			return proxyMap[ name ] !== undefined;
		},
		
		/**
		 * Retrieves an existing instance of a proxy registered under the given name.
		 * @param {String} The name of the proxy.
		 * @return {jQuery.mvc.Proxy} The registered proxy instance.
		 */
		get: function( name ) {			
			return $.mvc.model.has( name ) ? proxyMap[ name ] : null;
		},
		
		/**
		 * Registers a new instance of a <code>jQuery.mvc.Proxy</code> with the model.
		 * The instance can optionally be given a unique name. If it is not, such a name will
		 * be generated automatically.
		 * @param {String}   name    The name under which to register the instance. (Optional)
		 * @param {Function} proxy   The proxy's constructor function.
		 * @param {Object}   options A hash of options with which the proxy will
		 *                           be configured.	 
		 * @param {*}        data    An existing data object the proxy should manage. (Optional)
		 * @return {jQuery.mvc.Proxy} The registered proxy instance.
		 */
		register: function( name, proxy, options, data ) {
			var proxy;
			
			// Normalize arguments to handle the optional name.
			if ( typeof name !== "string" ) {
				data = options;
				options = proxy;
				proxy = name;				
				name = "proxy-" + ( ++proxyGuid );
			}		
			
			// Do not allow re-registration. If a proxy already exists, it must
			// be unregistered first.
			if ( $.mvc.model.has( name ) ) {
				throw "jQuery.mvc.model: A proxy named '" + name + "' already exists.";
			}
			
			// Construct the proxy and register it in the map.
			proxy = proxyMap[ name ] = new proxy( name, options, data );
			
			// Alert the proxy that it has been registered.
			proxy._register();
			
			return proxy;
		},
		
		/**
		 * Removes a registered proxy from the model.
		 * @param {jQuery.mvc.Proxy / String} The proxy or its name.
		 */
		remove: function( proxy ) {
		
			// If an object, must be sure that it is an actual registered proxy.
			if ( typeof proxy === "object" ) { proxy = proxy.getName(); }
			proxy = proxyMap[ proxy ];
			
			if ( proxy !== undefined ) {			
			
				// Remove the proxy from the map.
				delete proxyMap[ proxy.getName() ];				
				
				// Alert the proxy that it has been removed.
				proxy._remove();
			}
		}
	}

	/**
	 * Creates a new jQuery.mvc proxy prototype with the given name. If the name includes
	 * a leading namespace (separated from the name by a dot), the prototype is stored at	 
	 * the location jQuery.mvc.<namespace>.<name> for further use.
	 * @param {String} name  The name of the new proxy prototype, which may include
	 *                       a leading namespace separated by a period.
	 * @param {Object} base  An optional base prototype from which to derive the new proxy
	 *                       prototype.	The base proxy <code>jQuery.mvc.Proxy</code> will
	 *                       be used when this parameter is omitted.
	 * @param {Object} proto The definition for the new proxy prototype.
	 * @return {Function} The constructor function for the new proxy prototype.
	 */
	$.mvc.proxy = function( name, base, proto ) {
		
		if ( typeof proto === "undefined" ) {
			proto = base;
			base = $.mvc.Proxy;
		}
		
		return $.mvc.module( name, base, proto );
	}
		
		
	/**
	 * The base proxy from which all other proxies that can be registered
	 * with the jQuery.mvc manifold's model should derive.
	 * @constructor
	 */
	$.mvc.Proxy = $.mvc.module("Proxy", $.mvc.Module, {
	
		/**
		 * The proxy's underlying data.
		 * @type {*}
		 */
		data: null,

		/**
		 * Retrieves the proxy's raw underlying data object.
		 * @return {*} The proxy's raw underlying data object.
		 */		
		getData: function() {
			return this.data;
		},
		
		_createModule: function( name, options, data ) {			
			this.name = name;		
			this.data = data;
			this.options = $.extend( true, {}, this.options, options );	
		},
		
		_register: function() { },
		
		_remove: function() { }
	});


})( jQuery );


/** jQuery.mvc.view.js **/ 

( function( $, undefined ) {

	var mediatorMap = {}, mediatorGuid = 0;

	/**
	 * The static view singleton of the jQuery.mvc manifold.
	 * 
	 * <p>The view assumes these responsibilities:</p>
	 * <ul>
	 * <li>Maintaining a cache of mediator instances.</li>
	 * <li>Providing methods for registering, retrieving, and removing mediators.</li>
	 * <li>Notifiying mediators when they are registered or removed.</li>
	 * </ul>	
	 */
	$.mvc.view = {

		/**
		 * Checks if a mediator has been registered with the view.
		 * @param {String} The name of the mediator.
		 * @return {Boolean} Whether a mediator is currently registered under the given name.
		 */
		has: function( name ) {
			return mediatorMap[ name ] !== undefined;
		},

		/**
		 * Registers a new instance of a <code>jQuery.mvc.Mediator</code> the view.
		 * The instance can optionally be given a unique name. If it is not, such a name will
		 * be generated automatically.
		 * @param {String}   name     The name under which to register the instance. (Optional)
		 * @param {Function} mediator The mediator's constructor function.
		 * @param {Object}   options  A hash of options with which the mediator will
		 *                            be configured.	 
		 * @param {DOMElem}  element  The DOM element the mediator will use as a view component.
		 * @return {jQuery.mvc.Mediator} The registered mediator instance.
		 */
		register: function( name, mediator, options, element ) {
			var mediator;
			
			// Normalize arguments to handle the optional name.
			if ( typeof name !== "string" ) {
				element = options;
				options = mediator;
				mediator = name;
				name = "mediator-" + ( ++mediatorGuid );
			}		
			
			// Do not allow re-registration. If a mediator already exists, it must
			// be unregistered first.
			if ( $.mvc.view.has( name ) ) {
				throw "jQuery.mvc.view: A mediator named '" + name + "' already exists.";
			}
			
			// Construct the mediator and register it in the map.
			mediator = mediatorMap[ name ] = new mediator( name, options, element );
			
			// Register observers for the mediator's notification interests.
			$.each( mediator.notificationInterests, function( name, fn ) {					
				if ( $.isFunction( fn = mediator[ fn ] ) ) {
					$.mvc.notifier.register( name, $.mvc.Observer( fn, mediator ) );
				}
			});
			
			// Alert the mediator that it has been registered.
			mediator._register();
			
			return mediator;			
		},
		
		/**
		 * Removes a registered mediator from the view.
		 * @param {jQuery.mvc.Mediator|String} The mediator or its name.
		 */
		remove: function( mediator ) {
		
			// If an object, must be sure that it is an actual registered mediator.
			if ( typeof mediator === "object" ) { mediator = mediator.getName(); }
			mediator = mediatorMap[ mediator ];
			
			if ( mediator !== undefined ) {	
				
				// Remove observers for the mediator's notification interests.
				$.each( mediator.notificationInterests, function( name, fn ) {
					$.mvc.notifier.remove( name, mediator );
				});

				// Remove the mediator from the map.
				delete mediatorMap[ mediator.getName() ];					
				
				// Alert the mediator that it has been removed.
				mediator._remove();
			}
		}
	}

	/**
	 * Creates a new jQuery.mvc mediator prototype with the given name. If the name includes
	 * a leading namespace (separated from the name by a period), the prototype is stored at	 
	 * the location jQuery.mvc.<namespace>.<name> for further use.
	 * @param {String} name  The name of the new mediator prototype, which may include
	 *                       a leading namespace separated by a period.
	 * @param {Object} base  An optional base prototype from which to derive the new mediator
	 *                       prototype.	The base mediator <code>jQuery.mvc.Mediator</code>
	 *                       will be used when this parameter is omitted.
	 * @param {Object} proto The definition for the new mediator prototype.
	 * @return {Function} The constructor function for the new mediator prototype.
	 */
	$.mvc.mediator = function( name, base, proto ) {
		
		if ( typeof proto === "undefined" ) {
			proto = base;
			base = $.mvc.Mediator;
		}
		
		return $.mvc.module( name, base, proto );
	}

	/**
	 * The base mediator from which all other mediators that can be registered
	 * with the jQuery.mvc manifold's view should derive.
	 * @constructor
	 */
	$.mvc.Mediator = $.mvc.module("Mediator", $.mvc.Module, {
	
		/**
		 * A jQuery selector refering to the DOM element serving as the
		 * mediator's view component.
		 * @type jQuery
		 */
		element: $([]),
		
		/**
		 * A map of notification names to member method names. Used to indicate
		 * which notifications the mediator is interested in and which handlers
		 * should be called when these notifications are observed.
		 * @type Object.<String,String>
		 */
		notificationInterests: { },
		
		_createModule: function( name, options, element ) {
			element = element || $([]);
			
			this.name = name;			
			this.options = $.extend( true, {}, this.options, options );				
			this.element = ( element.jquery === undefined ) ? $(element) : element;
		},
		
		_register: function() { },
		
		_remove: function() { }

	});

})( jQuery );


/** jQuery.mvc.controller.js **/ 

( function( $, undefined ) {

	var commandMap = {};

	/**
	 * The controller singleton of the jQuery.mvc manifold.
	 * 
	 * <p>The controller assumes these responsibilities:</p>	 
	 * <ul>
	 * <li>Maintaining a cache of constructor functions for commands intended to handle
	 * notifications.</li>
	 * <li>Registering itself as an observer with the notifier dispatch for each notification
	 * that it receives a command mapping for.</li>	 
	 * <li>Creating and executing instances of the proper command to handle a given
	 * notification received from jQuery.mvc.notifier.</li>
	 * </ul>
	 */
	$.mvc.controller = {

		/**
		 * Checks if a notification has a command registered with the controller.
		 * @param {String} The notification's name.
		 * @return {Boolean} Whether a command is currently registered for the given notification.
		 */
		has: function( notificationName ) {
			return commandMap[ notificationName ] !== undefined;
		},
		
		/**
		 * Retrieves the constructor function for the <code>jQuery.mvc.Command</code> that is
		 * registered for the given notification name.
		 * @param {String} The notification's name.
		 * @return {Function} The constructor function.
		 */
		get: function( name ) {			
			return $.mvc.controller.has( name ) ? commandMap[ name ] : null;
		},
		
		/**
		 * Registers a constructor function for a <code>jQuery.mvc.Command</code> with the
		 * controller. Individual instances of the command will be created and executed for
		 * each matching notification observed.
		 * @param {String}   notificationName The notification for which the command shall
		 *                                    be executed.
		 * @param {Function} command          The command's constructor function.
		 * @param {Object}   options          A hash of options with which instances of the
		 *                                    registered command will be configured before
		 *                                    execution.
		 */
		register: function( notificationName, command, options ) {
			var observer;
			
			// Do not allow re-registration. If a command is already registered for the
			// notification name, it must be unregistered first.
			if ( $.mvc.controller.has( notificationName ) ) {
				throw "jQuery.mvc.controller: A command is already registered for notifications named '" + name + "'.";
			}
			
			// Construct an observer around a factory method for the command prototype and
			// store it in the map. A reference to the controller object is used as the
			// observer's context. The context here serves no purpose other than being a
			// key used for later removal of the observer.			
			observer = commandMap[ notificationName] = $.mvc.Observer( function( notification ) {
				var instance = new command( options );
				instance.execute( notification );
			}, $.mvc.controller );
			
			// Register the command's observer.
			$.mvc.notifier.register( notificationName, observer );			
		},
		
		/**
		 * Removes a command registered for a particular notifcation from the controller.
		 * @param {String} notificationName The notification for which to remove the command.
		 */
		remove: function( notificationName ) {
			var observer = commandMap[ notificationName ];
			if ( observer !== undefined ) {
				
				// Remove the command's observer, using the controller as the context and key.
				$.mvc.notifier.remove( notificationName, $.mvc.controller );
				
				// Remove the observer from the map.
				delete commandMap[ notificationName ];
			}
		}		
	}
	
	/**
	 * Creates a new jQuery.mvc command prototype with the given name. If the name includes
	 * a leading namespace (separated from the name by a period), the prototype is stored at	 
	 * the location jQuery.mvc.<namespace>.<name> for further use.
	 * @param {String} name  The name of the new command prototype, which may include
	 *                       a leading namespace separated by a period.
	 * @param {Object} base  An optional base prototype from which to derive the new command
	 *                       prototype.	The base command <code>jQuery.mvc.Command</code> will
	 *                       be used when this parameter is omitted.
	 * @param {Object} proto The definition for the new command prototype.
	 * @return {Function} The constructor function for the new command prototype.
	 */
	$.mvc.command = function( name, base, proto ) {
		
		if ( typeof proto === "undefined" ) {
			proto = base;
			base = $.mvc.Command;
		}
		
		return $.mvc.module( name, base, proto );
	}
	
	/**
	 * The base command from which all other commands that can be registered
	 * with the jQuery.mvc manifold's controller should derive.
	 * @constructor
	 */
	$.mvc.Command = $.mvc.module("Command", $.mvc.Module, {
	
		/**
		 * Executes the command whenever the notification it was registered for is observed.
		 * @param {jQuery.mvc.Notification} notification The observed notification.
		 */
		execute: function( notification ) { }
	});

})( jQuery );


/** jQuery.mvc.notifier.js **/ 

( function( $, undefined ) {

  var observerMap = {}, notificationQueue = $({}), notificationSync = 0;

	/**
	 * The notifier singleton which provides notification based messaging
	 * between modules of the jQuery.mvc manifold.
	 *
	 * <p>The notifier assumes these responsibilities:</p>
	 * <ul>
 	 * <li>Managing the observer lists for each notification in the application.</li>
	 * <li>Providing a method for attaching observers to a notification's observer list.</li>
	 * <li>Providing a method for broadcasting a notification.</li>
	 * <li>Notifying observers of a given notification when it is broadcast.</li>
	 * </ul>
	 */
	$.mvc.notifier = {
		
		/**
		 * An option hash with settings for the notifier singleton.
		 * @type Object
		 */
		options: {
			/**
			 * Defines the maximum number of observers to call in one synchronous iteration.
			 * This option is used in conjunction with the <code>maxSync</code> option to
			 * configure a timeslicing feature that should prevent browsers from showing
			 *script timeout warnings.
			 * @type Number
			 */
			maxSync: 5,
			
			/**
			 * Defines the number of milliseconds of delay inserted before starting a next 
			 * synchronous iteration of calls to observers. This option is used in conjunction
			 * with the <code>maxSync</code> option to configure a timeslicing feature that
			 * should prevent browsers from showing script timeout warnings.
			 * @type Number
			 */
			delay: 10
		},
		
		/**
		 * Registers an observer for a notification.
		 * @param {String}              notificationName The notification for which to register.
		 * @param {jQuery.mvc.Observer} observer         The observer to register.
		 */
		register: function( notificationName, observer ) {
			var observers = observerMap[ notificationName ];
			if ( observers !== undefined ) {				
				observers.push( observer );
			} else {
				observerMap[ notificationName ] = [ observer ];
			}
		},
		
		/**
		 * Removes observers for a particular context from a notification's observer list.
		 * @param {String} notificationName The notification from which to remove observers.
		 * @param {Object} context          The context for which to remove observers.
		 */
		remove: function( notificationName, context ) {
			var observers = observerMap[ notificationName ];
			if ( observers !== undefined ) {
			
				// Authors should treat all observers of notifications as true asynchronous
				// callbacks with indeterminate execution order. Thus, the observers array
				// may freely be permuted and truncated, which is the fastest way to remove
				// entries from an array.
				for (var i = 0, n = observers.length ; i < n ; ++i ) {
					
					if ( observers[ i ].context == context ) {
												
						observers[ i ] = observers[ n - 1 ];
						n = n - 1; // Truncate one element
						i = i - 1; // Re-access the i-th element: the observer that was swapped
						           // in may also need to be removed.
					}
				};
				
				if ( n === 0 ) {
					delete observerMap[ notificationName ];
				} else {
					observers.length = n;
				}
			}
		},
		
		/**
		 * Notifies observers of a notification
		 * @param {jQuery.mvc.Notification} notification The notification.
		 */
		notify: function( notification ) {
			var observers = observerMap[ notification.name ],				
				o = $.mvc.notifier.options;
				
			if ( observers !== undefined ) {
				
				// Authors should treat all observers of notifications as true asynchronous
				// callbacks. Thus, the observers array may freely be processed in chunks to
				// prevent script timeout warnings in browsers.
				$.each( observers.slice(), function( i, observer ) {				
					
					notificationQueue.queue( function( next ) {
						observer.notify( notification );
						notificationSync += 1;
						
						if ( notificationSync > o.maxSync ) {		
							notificationSync = 0;
							setTimeout( next, o.delay );
						} else {
							next();
						}
					});
					
				});
			}
		}
	}
	
	/**
	 * Creates a new <code>jQuery.mvc.Notification</code> instance.
	 * @constructor
	 * @param {String} name The notification's name.
	 * @param {Object} body The notification's body or data.
	 */
	$.mvc.Notification = function( name, body ) {
		// Allow calling as a regular function without the new keyword.
		if ( !( this && this.hasOwnProperty && this instanceof $.mvc.Notification ) ) {
			return new $.mvc.Notification( name, body );
		}
		
		this.name = name;
		this.body = body;
	}

	$.mvc.Notification.prototype = {
		/**
		 * The name of the notification.
		 * @type String
		 */
		name: "notification",
		
		/**
		 * The body of the notification.
		 * @type String
		 */
		body: { }
	}
	
	/**
	 * Creates a new <code>jQuery.mvc.Observer</code> instance.
	 * @constructor	 
	 * @param {Function} fn      The function which will be called when a notification is observed.
	 * @param {Object}   context The context with which the observing function will be called.
	 */
	$.mvc.Observer = function( fn, context ) {
	
		// Allow calling as a regular function without the new keyword.
		if ( !( this && this.hasOwnProperty && this instanceof $.mvc.Observer ) ) {
			return new $.mvc.Observer( fn, context );
		}
		
		this.fn = fn;
		this.context = context;	
	}
		
	$.mvc.Observer.prototype = {
		
		/**
		 * The function to call when a notification is observed.
		 * @type Function
		 */
		fn: $.noop,
		
		/**
		 * The context with which the observer function will be called.
		 * @type Object
		 */
		context: { },
		
		/**
		 * Calls the observing function with an observed notification.
		 * @param {jQuery.mvc.Notification} notification The observed notification.
		 */
		notify: function( notification ) {
			this.fn.call( this.context, notification );
		}
		
	}

})( jQuery );