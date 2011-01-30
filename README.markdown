Introduction
============

This plugin extends jQuery with a small boilerplate framework for development according to the classic Model-View-Controller architectural pattern. The focus of this plugin is on keeping things light and flexible, and not forcing the programmer into the architecture of a full framework. There are no restriction by having to 'buy into' any architecture or library other than jQuery core itself and the plugin's MVC boilerplate, which - because of re-use of established practices - will feel largely reminiscent of jQuery UI widgets.

License
-------

This plugin is dual licensed under GPL and MIT licenses.

Overview
========

The MVC pattern's implementation mimics the approach taken by PureMVC: the jQuery.mvc namespace offers the model, view and controller as a set of singletons serving as repositories. Smaller user-built modules can be registered to handle the responsibilities associated with the model, view and controller components of the pattern. 

Communication between these modules takes place through a simple publish / subscribe notification system. This system has intentionally been kept separate from jQuery's own event handling system, which keeps it as light as possible and allows for simple, fast code tailored specifically to the system's requirements.

Model & data proxies
--------------------

The model component of the MVC pattern should focus on storage and mutation of the application's data model. The model delegates its actions to a series of user-built data proxies. Data proxies registered with the model provide structured access to and management of (parts of) your application's data model. Depending on the implementation of a particular data proxy, it could manage a plain JavaScript object, some form of local storage or remote data manipulated through asynchronous requests. The underlying implementation is left to the programmer.

### An example: a simple incrementing counter

The following example defines a data proxy which keeps a simple incrementing counter.

	jQuery.mvc.proxy( "examples.CounterProxy", {
		_register: function() {
			this.data = 0;
		},
		
		increment: function() {
			this.data++;
			this._notify( "counterchange", { counter: this.data });
		}
	});
	
When an instance of the counter has been created, it can be incremented using the public increment method. This will increment the internal counter and generate a notification with the new value. Subscribed observers may listen for changes this way.

	var counterProxy = jQuery.mvc.model.register( "counterProxy", jQuery.mvc.examples.CounterProxy );
	counterProxy.increment();


View & view mediators
---------------------

The view component of the MVC pattern should focus on two things. First, it should focus on presenting data to the user. Second, it should focus on monitoring the user's interaction with interactive user interface components. The view delegates its actions to a series of view mediators, custom-built by the programmer. View mediators registered with the model may listen for notifications carrying fresh data or may send notifications carrying user input. To display changed data Mediators might directly manipulate the DOM, but they can also rely on other jQuery plugins or on jQuery UI widgets. The underlying implementation is left to the programmer.

### An example: a simple incrementing counter (continued)

The following example defines a view mediator that can display updates to the counter data proxy from the earlier example. Furthermore, the mediator responds to button clicks by incrementing the proxy's counter. It also shows that the plugin allows a view mediator to directly interact with a proxy. (This may be useful for simple scenarios, where little application/business logic is involved.)

	jQuery.mvc.mediator( "examples.CounterMediator", {
		options: {
			direct: true
		},
		
		notificationInterests: {
			"counterchange" : "_counterChange"
		},
		
		_register: function() {
			this._counter = $( "<span/>" ).appendTo( this.element );
			this._button = $( "<input type='button'/>" ).appendTo( this.element );				
						
			this._button.bind( "click", jQuery.proxy( this, "_buttonClick" ));
		},
		
		_remove: function() {
			this._button.remove();
			this._counter.remove();			
		}
		
		_buttonClick: function( event ) {
			event.preventDefault();
			
			// Either directly interact with the counter proxy or send a notification
			// for another part of the application to process.
			if ( this.options.direct ) {
				jQuery.mvc.model.getProxy( "counterProxy" ).increment();
			} else {
				this.notify( "requestIncrement" );
			}		
		},
		
		_counterChange: function( note ) {				
			this._counter.text( note.body.counter );
		}
	});
	
	jQuery.mvc.model.register( "counterProxy", jQuery.mvc.examples.CounterProxy );
	jQuery.mvc.view.register( "counterMediator", jQuery.mvc.examples.CounterMediator, { }, $( "body" ));
		
		
Controller & commands
---------------------

The controller component of the MVC pattern should focus on application/business logic that must be run when particular events, i.e., notifications take place. The controller delegates its actions to a series of commands, custom built by the programmer. A command us registered with the controller for a particular type of notification: each notification may only have a single command registered. Each time a notification is received, a fresh instance of the registered command in question will be created and its contained application/business logic will be executed. The underlying implementation of a command is left to the programmer.

### An example: a simple incrementing counter (continued)

The following example builds upon the example started with the counter data proxy and continued with the paired view mediator. The example defines a command that is used to communicate with the counter data proxy. This avoids a tight coupling between view mediator and data proxy and prevents pollution of the view with application logic decisions. (In this case the command itself is trivial and merely to illustrate the point.)

	jQuery.mvc.command( "examples.IncrementCommand", {
		execute: function( note ) {
			if ( note.name === "requestIncrement" ) {
				jQuery.mvc.model.getProxy( "counterProxy" ).increment();
			}
		}
	})
	
	jQuery.mvc.model.register( "counterProxy", jQuery.mvc.examples.CounterProxy );
	jQuery.mvc.view.register( "counterMediator", jQuery.mvc.examples.CounterMediator, { direct: false }, $( "body" ));
	jQuery.mvc.controller.register( "requestIncrement", jQuery.mvc.examples.IncrementCommand );

	
A note on unit testing
----------------------

Should you desire to run unit tests on individual data proxies, view mediators or commands, then it might be necessary to manually prepare and inject a particular notification or manually register an (outside) observer function for a particular notification. The notifier singleton around which the MVC plugin's notification system is centered, has publicly accessible methods for registering observers and sending notifications.

	// Attaching an outside observer to test a notification
	var observer = jQuery.mvc.observer( this, function(note) {
		assert( note.body.foo === "bar" );
	});
	jQuery.mvc.notifier.register( "test", observer );

	// Preparing and injecting a notification to start a test.
	var notification = jQuery.mvc.notification( "test", { foo: "bar" });
	jQuery.mvc.notifier.notify( notification );
	
	
	

Plugin API
==========

Following is a documentation of the plugin's public API, with short examples illustrating use cases. At present the documentation is still incomplete. Plugin users may look at the development version of the plugin's code, which is fully commented.


jQuery.mvc.model
----------------

The model singleton assumes the following responsibilities:
*	Maintaining a cache of data proxy instances.
*	Providing methods for registering, unregistering and retrieving data proxies.
*	Notifiying data proxies when they are registered or removed.

### jQuery.mvc.model.register( [name], proxy, options, [data] )

Creates and registers a new named instance of a particular proxy class with the model. If no name is given, one will automatically be generated. The proxy can be configured using a hash of key-value options and may optionally be given an initial data object to act upon.

		// creating a manually named instance
		proxy = jQuery.mvc.model.register( "instanceName", ProxyClass, { key: "value" });
		
		// creating an automatically named instance
		proxy = jQuery.mvc.model.register( ProxyClass, { key: "value" });
		
		// creating a manually named instance with initial data object
		proxy = jQuery.mvc.model.register( "instanceName", ProxyClass, { key: "value" }, { foo: 1, bar: "2" })

### jQuery.mvc.model.remove( {name|proxy} )

Removes a proxy instance previously registered with the model.

		// assuming a proxy named "instanceName"
		jQuery.mvc.model.remove( "instanceName" );

		// assuming 'proxy' refers to a registered proxy instance
		jQuery.mvc.model.remove( proxy );

### jQuery.mvc.model.has( name )

Checks if a proxy has been registered with the model under the given name.

		// assuming a proxy named "instanceName" is registered
		jQuery.mvc.model.has( "instanceName" ); // true

		// assuming a proxy named "instanceName" is not registered
		jQuery.mvc.model.has( "instanceName" ); // false

### jQuery.mvc.model.get( name )

Retrieves an existing instance of a proxy from the model, if one exists.

		// assuming a registered proxy named "instanceName"
		proxy = jQuery.mvc.model.get( "instanceName" ); // the proxy instance

		// assuming a proxy named "instanceName" is not registered
		proxy = jQuery.mvc.model.get( "instanceName" ); // null

		
jQuery.mvc.view
---------------

The view singleton assumes the following responsibilities:
*	Maintaining a cache of view mediator instances.
*	Providing methods for registering, unregistering or retrieving view mediators.
*	Notifiying view mediators when they are registered or unregistered.

### jQuery.mvc.view.register( [name], mediator, options, [element] )

Creates and registers a new named instance of a particular mediator class with the view. If no name is given, one will automatically be generated. The mediator can be configured using a hash of key-value options. Generally, the mediator should be given a DOM element to act upon. However, for those cases where a mediator has no ties to the DOM the element parameter is made optional. You may pass a string-based selector, a DOM element or a jQuery selector object. 

		// creating a manually named instance
		mediator = jQuery.mvc.view.register( "instanceName", MediatorClass, { key: "value" }, "body" );

		// passing a DOM element 
		mediator = jQuery.mvc.view.register( "instanceName", MediatorClass, { key: "value" }, document.body );
		
		// passing a jQuery selector object
		mediator = jQuery.mvc.view.register( "instanceName", MediatorClass, { key: "value" }, $( "body" ));
		
		// creating an automatically named instance
		mediator = jQuery.mvc.view.register( MediatorClass, { key: "value" }, "body" );		
		
### jQuery.mvc.view.remove( {name|mediator} )

Removes a mediator instance previously registered with the view.

		// assuming a mediator named "instanceName" is registered
		jQuery.mvc.view.remove( "instanceName" );

		// assuming 'mediator' refers to a registered mediator instance
		jQuery.mvc.view.remove( mediator );

### jQuery.mvc.view.has( name )

Checks if a mediator has been registered with the view under the given name.

		// assuming a mediator named "instanceName" is registered
		jQuery.mvc.view.has( "instanceName" ); // true

		// assuming a mediator named "instanceName" is not registered
		jQuery.mvc.view.has( "instanceName" ); // false

### jQuery.mvc.view.get( name )

Retrieves an existing instance of a mediator from the view, if one exists.

		// assuming a registered mediator named "instanceName"
		mediator = jQuery.mvc.view.get( "instanceName" ); // the mediator instance

		// assuming a mediator named "instanceName" is not registered
		mediator = jQuery.mvc.view.get( "instanceName" ); // null
		
		
		
jQuery.mvc.controller
---------------------

The controller singleton assumes these responsibilities:
*	Maintaining a cache of constructor functions for commands intended to handle notifications.
*	Registering itself as an observer for each notification that it receives a command mapping for.
*	Creating and executing instances of the proper command to handle an observed notification.	 


### jQuery.mvc.controller.register( notificationName, command, options )

Registers a command class with the controller. Individual instances of the command will be created and executed for each observed notification of the given name. Created instances can be configured using a hash of key-value options.

		// registering a command for a notification
		jQuery.mvc.controller.register( "notificationName", CommandClass, { key: "value" });
		
### jQuery.mvc.controller.remove( notificationName )

Removes a command registered for a particular notifcation from the controller.

		// assuming a notification named "notificationName" has a command registered
		jQuery.mvc.controller.remove( "notificationName" );
		
### jQuery.mvc.controller.has( notificationName )

Checks if a notification has a command registered with the controller.

		// assuming a notification named "notificationName" has a command registered
		jQuery.mvc.controller.has( "notificationName" ); // true

		// assuming a notification named "notificationName" has no command registered
		jQuery.mvc.controller.has( "notificationName" ); // false

### jQuery.mvc.controller.get( notificationName )

Retrieves a registered command's constructor function from the controller, if one exists.

		// assuming a notification named "notificationName" has a command registered
		Command = jQuery.mvc.controller.get( "notificationName" ); // the command's constructor function

		// assuming a notification named "notificationName" has no command registered
		Command = jQuery.mvc.controller.get( "notificationName" ); // null
		
		
jQuery.mvc.notifier
-------------------

The notifier assumes these responsibilities:
*	Managing the observer lists for each notification in the application.
*	Providing a method for attaching observers to a notification's observer list.
*	Providing a method for broadcasting a notification.
*	Notifying observers of a given notification when it is broadcast.

The notifier should not be used directly by the programmer, unless performing such activities as unit testing.

### jQuery.mvc.notifier.register( "notificationName", observer )

Register an observer instance for a particular notification. Observer instances are created using the jQuery.mvc.Observer constructor function.

### jQuery.mvc.notifier.remove( "notificationName", context )

Removes observers for a particular context from a notification's observer list.

### jQuery.mvc.notifier.notify( notification )

Notifies observers of a notification. Notifications are created using the jQuery.mvc.Notification constructor function.