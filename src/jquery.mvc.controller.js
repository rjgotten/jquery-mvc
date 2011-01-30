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