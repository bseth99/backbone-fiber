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
 

Read the blog post that provides some background and discusses the core concepts of the design.

Look at the demo.  It uses most of the features and shows the structure of a project.

Usage
---------------

The easiest way to get started using Fiber will be to use the Yeoman generator.  I'm writing it ...

    yo backbone-fiber
    npm install
    bower install
    
This will setup all the dependencies, create directories, and generate a index.html, config.js, and main.js to get you started.  Your next step will be to write a view.  Yeoman can help with that too:

    yo backbone-fiber view:myview
    
Check out the generator project page for a full reference of commands.

If you'd like to do things your way, you can use Bower:

    bower https://github.com/bseth99/backbone-fiber.git
    
Or, just download the latest build.


Every view model could have all or none of these parts:

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
    

And, make sure to make an HTML file of the same name as the JS file defining the view so Fiber can compile it and attach it to the view definition when its loaded.

To use a view, just declare its binding point in your markup.  You might have this on your body tag in the main HTML file:

    <body data-view="shell">
    </body>

Fiber looks for the ````data-view```` attribute and will load the module with RequireJS, create an instance, and render the view into the DOM using body as the container.  The callbacks defined in the view module are called at appropriate points in the life-cycle to handle creation, rendering, state changes, and finally destruction.


The events hash now can handle mapping data events from collections and models, DOM events, and other views.  

    events: {
      'click li': '...',     // Normal DOM event
      
      'change.nav': '...',   // Custom event triggered by nav view
      
      'sync.data': '...',    // Model/Collection sync event
    }
    
  - DOM events work the same  
  - All data events should be specified with a ````.data```` namespace.  These will be bound locally using listenTo and not bubbled outside of the view
  - View events can be bound to children (and down) using the topic.namespace convention.  The topic is what it used in the normal ````trigger()```` function.  The namespace is the module id (less the view base path).  The handler function will receive two arguements.  The first will be a normal jQuery event object.  The second will be a object hash with these keys:    
    - view - view instance that triggered the event
    - data - object passed in the ````trigger()```` function




Todo
---------------

  - Allow other templating engines
  - Add comments to the code.  
  - I had more but forgot :( 
  
Release History
---------------

  v0.0.1 - Epoch
  
