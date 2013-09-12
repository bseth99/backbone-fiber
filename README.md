Backbone.Fiber
=========

Build more modular Backbone applications.  Fiber is specifically designed to fill several needs that you will
encounter while developing many single page applications: 

  - Dynamic, asynchronous loading of views using RequireJS to create modules.  The template is automatically 
loaded and compiled with the view during the loading process
  - Declarative binding of views to the DOM.  Instances are automatically created and inserted into a parent/child 
relationship that mirrors the structure of the DOM
  - DOM, model, and view events are bound through the same events hash for consistency and hierarchical filtering
  - All clean up is automatic regardless of how you remove something
 

Read the [blog post](http://www.benknowscode.com/2013/08/extending-backbone-for-building-better-web-applications.html) 
that provides some background and discusses the core concepts of the design.

Look at [the demo](http://bseth99.github.io/backbone-fiber-demo/).  It uses most of the features and shows the 
structure of a project.

Usage
---------------

The easiest way to get started using Fiber will be to use the 
[Yeoman generator](https://github.com/bseth99/generator-backbone-fiber):
      
    npm install -g yo
    npm install -g https://github.com/bseth99/generator-backbone-fiber
    yo backbone-fiber
    
This will setup all the dependencies, create directories, and generate a index.html, config.js, and main.js to get 
you started.  Your next step will be to write a view.  Yeoman can help with that too:

    yo backbone-fiber:view myview
    
Check out the [generator project page](https://github.com/bseth99/generator-backbone-fiber) for a full reference of 
commands and how it can make your workflow better.

If you'd like to do things your way, you can use Bower:

    bower https://github.com/bseth99/backbone-fiber.git
    
Or, just download the latest build.


### Defining Views ###

Every view could have all or none of these parts:

    define( ['models/mymodel', 'backbone'], function( Model, Backbone ) {

        return Backbone.View.extend({
          
          setup: function() {
              // Initialize instance variables
          },

          beforeRender: function() {
              // Modify stuff; cancel rendering
          },

          afterRender: function() {
              // Initialize widgets, if any
              // Cache DOM references
          },

          events: {
              // Data and state changes
          },

          destroy: function() {
              // Delete instance variables, if needed
          }
      });
    });
    

And, make sure to make an HTML file of the same name as the JS file defining the view so Fiber can compile it and attach 
it to the view definition when its loaded.

To use a view, just declare its binding point in your markup.  You might have this on your body tag in the main HTML file:

    <body data-view="shell">
    </body>

Fiber looks for the `data-view` attribute and will load the module with RequireJS, create an instance, and render 
the view into the DOM using body as the container.  The callbacks defined in the view module are called at appropriate 
points in the life-cycle to handle creation, rendering, state changes, and finally destruction.


The events hash now can handle mapping data events from collections and models, DOM events, and other views.  

    events: {
      'click li': '...',     // Normal DOM event
      
      'change.nav': '...',   // Custom event triggered by nav view
      
      'sync.data': '...',    // Model/Collection sync event
    }
    
  - DOM events work the same  
  - All data events should be specified with a ````.data```` namespace.  These will be bound locally using listenTo 
    and not bubbled outside of the view
  - View events can be bound to children (and down) using the topic.namespace convention.  The topic is what it used 
    in the normal ````trigger()```` function.  The namespace is the module id (less the view base path).  The handler 
    function will receive two arguements.  The first will be a normal jQuery event object.  The second will be a object 
    hash with these keys:    
    - view - view instance that triggered the event
    - data - object passed in the ````trigger()```` function


### Configuration ###

`Fiber.viewPath` (default: 'views/') - Set the base path to find views relative to the RequireJS basePath.  
View module IDs will be relative to this location. For example, if the basePath is scripts and views are 
in the scripts/views folder then a view file named shell.js will be identified by RequireJS as views/shell 
but Fiber will index it as shell.


### Helpers ###

Fiber has several helper functions available both in the static Fiber global and in each view instance.  


`View.connect(target, options)` - Enables dynamically adding new DOM elements that will be
bound to a child view instance.

   - target [ String | DOMElement | jQuery Object ] - A string value represents the name of the view to bind to the DOM node.
   `factory()` is used to generate the new element with the data-view attribute
   set.  Pass a DOMElement or jQuery object to control how the node is inserted
   into the DOM (or override `factory()` if its the primary way to add nodes)

   - options [ Object ] - This hash will be passed to the view constructor and can be anything you'd
   normally pass to a view when creating an instance.  This can include the model
   or collection object.

   - returns a promise which will be resolved in the scope of the parent view and
   pass the new view instance as the argument to the callback function.

```
  var popover = this.findChild( 'popover' );
        
  if ( popover ) {
    popover.show( this.source.get( ui.data.item ), ui.data.row );
  } else {
    this.connect( 'popover' ).done(function( popover ) {
      popover.show( this.source.get( ui.data.item ), ui.data.row );
    });
  }
```

In this example, connect is used add a popover element in the DOM if its not already there.  Once
loaded, the popover instance show() method is called with the data and relative element to position
at.

`View.waitFor(children, callback)` - Helper function to ensure multiple views have finished loading before running
certain logic.  Calls the callback function once eveything has loaded in the children parameter.

   - children [ Array ] - Array of view names that should be children of the calling view instance.

   - callback [ Function ] - Function to call once all the view have loaded.

```
  this.waitFor( ['sidebar', 'content'], function() {
     self.source.load( ui.data.action ).done(function() {
         self.ready.call( self );
     });
  });
```

The above example used waitFor to ensure both the sidebar and content views have finished loading before
running the function that will initialize their data sources.

`View.findChild(target)` - Helper to return view instance based on the view name or jQuery element.

   - target - the name of the view to search for its child instance or a jQuery object representing
     the element to find the closest view instance.
     
   - returns the view instance or null if it can't be found.  If more than one match is located,
     returns the first match.  Use findChildren to retrieve an array of all the matching children of
     the same type.

```
  this.findChild( 'content' ).collection.reset(

    this.source.filter( function( model ) {
      ...
    })
  );
```

This example gets the content view instance and resets its collection.  If there's a possibility the 
view is not connected yet, check the return value and connect it, or use waitFor if you know it will load
and might not be ready yet.


Todo
---------------

  - Allow other templating engines
  - Add comments to the code.  
  - Revisit waitFor() and findChild()
  - Confirm several other use cases work with it
  
Release History
---------------

  v0.0.3 - Add setData() to enable changing the collection/model after initialization
  v0.0.2 - Fix recursive connect to allow direct descendants
  v0.0.1 - Epoch
  
