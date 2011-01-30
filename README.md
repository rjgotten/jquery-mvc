﻿# Introduction #
This plugin extends jQuery with a small boilerplate framework for development according to the classic Model-View-Controller architectural pattern. The focus of this plugin is on keeping things light and flexible, and not forcing the programmer into the architecture of a full framework. There are no restriction by having to 'buy into' any architecture or library other than jQuery core itself and the plugin's MVC boilerplate, which - because of re-use of established practices - will feel largely reminiscent of jQuery UI widgets.
# License #

## Model & data proxies ##

## View & view mediators ##
## jQuery.mvc.model ##

The model singleton assumes the following responsibilities:
*	Maintaining a cache of data proxy instances.

### jQuery.mvc.model.register( [name], proxy, options, [data] ) ###


		// creating a manually named instance
		proxy = jQuery.mvc.model.register( "instanceName", ProxyClass, { key: "value" });
		
		// creating an automatically named instance
		proxy = jQuery.mvc.model.register( ProxyClass, { key: "value" });
		
		// creating a manually named instance with initial data object
		proxy = jQuery.mvc.model.register( "instanceName", ProxyClass, { key: "value" }, { foo: 1, bar: "2" })
### jQuery.mvc.model.remove( {name|proxy} ) ###


		jQuery.mvc.model.remove( "instanceName" );

		// assuming 'proxy' refers to a registered proxy instance
		jQuery.mvc.model.remove( proxy );

### jQuery.mvc.model.has( name ) ###


		// assuming a proxy named "instanceName" is registered
		jQuery.mvc.model.has( "instanceName" ); // true

		// assuming a proxy named "instanceName" is not registered
		jQuery.mvc.model.has( "instanceName" ); // false

### jQuery.mvc.model.get( name ) ###


		// assuming a registered proxy named "instanceName"

		// assuming a proxy named "instanceName" is not registered
		proxy = jQuery.mvc.model.get( "instanceName" ); // null
		
## jQuery.mvc.view ##

*	Maintaining a cache of view mediator instances.