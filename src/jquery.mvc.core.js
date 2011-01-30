( function( $, undefined ) {

	// Make sure the jQuery.mvc namespace exists.
	$.mvc = $.mvc || {};
	
	/**
	 * Version indicator for the jQuery.mvc library.
	 * @type String
	 */
	$.mvc.version = "1.0.0";
	
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
		 * inside tight loops.		 * </p>		 
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