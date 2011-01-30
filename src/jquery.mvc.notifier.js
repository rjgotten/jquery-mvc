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
		
		notify: function( notification ) {
			this.fn.call( this.context, notification );
		}
		
	}

})( jQuery );