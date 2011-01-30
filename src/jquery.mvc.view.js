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