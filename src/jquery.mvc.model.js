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
	 */	$.mvc.model = {
	
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
		 * @param {Object}   options A hash of options with which the proxy will		 *                           be configured.	 
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