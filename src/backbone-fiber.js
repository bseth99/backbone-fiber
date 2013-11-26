/*!
 * Copyright (c) 2013 Ben Olson (https://github.com/bseth99/backbone-fiber)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * Dependancies: Backbone, jQuery, Underscore, RequireJS
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['jquery', 'underscore', 'backbone', 'base'], factory);
    } else {
        // Browser globals
        root.Backbone.Fiber = factory(root.$, root._, root.Backbone, Base);
    }
}(this, function ($, _, Backbone, Base) {

   // Replace and enhance
   Backbone.View.extend = Base.extend;
   Backbone.View.mix = Base.mix;

   var Fiber,
       _view_defs = {},
       _view_inst = {},
       _view_loading = {};

   // Store the old jQuery.cleanData
   var oldClean = $.cleanData;

   // Overwrites cleanData which is called by jQuery on manipulation methods
   $.cleanData = function( elems ) {
      for ( var i = 0, elem;
      (elem = elems[i]) !== undefined; i++ ) {
         // Trigger the destroyed event
         $(elem).triggerHandler( 'destroyed' );
      }
      // Call the old jQuery.cleanData
      oldClean(elems);
   };

   Backbone.Fiber = Fiber = {

      /**
      *  Set the base path to find views relative to the RequireJS
      *  basePath.  View module IDs will be relative to this location.
      *  For example, if the basePath is scripts and views are in the
      *  scripts/views folder then a view file named shell.js will be
      *  identified by RequireJS as views/shell but Fiber will index it
      *  as shell.
      */
      viewPath: 'views/',

      /**
      *  Given an element from the DOM, find the closest element (either
      *  it or one of its parents) that has a view instance bound and return
      *  that instance.
      */
      getViewFromEl: function( el ) {
         var $el = $( el ),
             dataCid = $el.attr( 'data-cid' ) || $el.closest( '[data-cid]' ).attr( 'data-cid' );

         if ( dataCid ) return _view_inst[dataCid];
      },

      /**
      *  Lookup a view instance from its cid
      */
      getViewFromCid: function( cid ) {

         return _view_inst[cid];
      },

      /**
      *  Get the DOM element a view instance is bound to based on its
      *  cid
      */
      getElFromCid: function( cid ) {

         if ( _view_inst[cid] )
            return _view_inst[cid].$el;
      },

      /**
      *  Return the promise for a view definition.  Only valid while loading,
      *  otherwise, returns nothing.
      */
      getPromise: function( view ) {

         if ( _view_loading[view] )
            return _view_loading[view];
      }
   }

   /**
   *  Wraps RequireJS and loads view modules with their template files.  Modifies the
   *  prototype with the view module name and the pre-compiled template function.
   */
   function load( target ) {

      var dfd = $.Deferred();

      if ( _view_defs[target] ) {

         dfd.resolve( _view_defs[target] );

      } else {

         _view_loading[target] = dfd;
         require( [Fiber.viewPath + target, 'text!' + Fiber.viewPath + target + '.html'], function( view, template ) {

            view.prototype.instanceOf = target;
            view.prototype.template = _.template( template );
            _view_defs[target] = view;

            delete _view_loading[target];
            dfd.resolve( view );
         });
      }

      return dfd.promise();
   }

   /**
   *  View factory method.  Creates instance, sets up the parent/child
   *  relationship and renders the view.
   */
   function create( view, $el, options ) {
   
      var inst = new view(_.extend( options, { el: $el[0] } )),
          parent, fizzle = false;

      $el.attr( 'data-cid', inst.cid );
      _view_inst[inst.cid] = inst;

      parent = $el.parents( '[data-view]' ).first();
      
      if ( parent.length > 0 ) {
         parent = parent.attr( 'data-cid' );
         if ( _view_inst[parent] ) {
            _view_inst[parent].addChild( inst );
            inst.setParent( _view_inst[parent] );
         } else {
            fizzle = true;
            inst.remove();
         }
      }

      if (!fizzle) { inst.render(); }
      return inst;
   
   }

   /**
   *  Finds the binding on the element, loads the view definition, and
   *  then creates the instance of the view with the passed in options and
   *  attaches it to the DOM element.
   */
   function connect( el, opts ) {

      var options = opts || {},
          $el = (el instanceof $ ? el : $(el)),
          dataView = $el.attr( 'data-view' );

      if ( dataView ) {

         load( dataView ).done( function( view ) {

            create( view, $el, options );

         });
      }

   }

   /* Optional if no top level catch-all, "application" view is defined */
   Fiber.start = function() { connect( document.body ); };

   Backbone.View.mix([{


      /**
      *  load() will attach the compiled template to the
      *  prototype of the loaded view.  No need to do anything
      *  with this.
      */
      template: null,

      /**
      *  The top-most view will be null, all others will have the
      *  cid of the nearest parent view instance.  create() sets this
      *  value when generating the instance.
      */
      parent: null,

      /**
      *  As each child is added, the parent view gets a reference to the
      *  cid.  create() also manages adding this while View.removeChild
      *  removes the reference when a child view removes itself.
      */
      children: null,

      /**
      *  Flag to determine if its the first render pass.  Changes the
      *  behavior of render() and how it responds to empty data sets.
      */
      renderedOnce: false,

      /**
      *  Flag to force the view to render even if it has an empty collection
      *  and has not renderedOnce
      */
      forceRender: false,
      
      
      /**
      *  Enables dynamically adding new DOM elements that will be
      *  bound to a child view instance.
      *
      *  target [ String | DOMElement | jQuery Object ]
      *
      *     A string value represents the name of the view to bind to the DOM node.
      *     factory() is used to generate the new element with the data-view attribute
      *     set.  Pass a DOMElement or jQuery object to control how the node is inserted
      *     into the DOM (or override factory() if its the primary way to add nodes)
      *
      *  options [ Object ]
      *
      *     This hash will be passed to the view constructor and can be anything you'd
      *     normally pass to a view when creating an instance.  This can include the model
      *     or collection object.
      *
      *  returns a promise which will be resolved in the scope of the parent view and
      *  pass the new view instance as the argument to the callback function.
      */
      connect: function( target, options ) {
         var $el, wait,
             self = this,
             dfd = $.Deferred();

         if ( typeof( target ) == 'string' )
            $el = this.factory( target );
         else
            $el = (target instanceof $ ? target : $(target));

         connect( $el, options );

         if ( ( wait = Fiber.getPromise( $el.attr('data-view') ) ) )
            wait.done(function( view ) {
               dfd.resolveWith( self, [Fiber.getViewFromEl( $el )] );
            });
         else
            dfd.resolveWith( this, [Fiber.getViewFromEl( $el )] );

         return dfd.promise();
      },

      /**
      *  Helper function to ensure multiple views have finished loading before running
      *  certain logic.  Calls the callback function once eveything has loaded in the
      *  children parameter.
      *
      *  children [ Array ]
      *
      *     Array of view names that should be children of the calling view instance.
      *
      *  callback [ Function ]
      *
      *     Function to call once all the view have loaded.
      */
      waitFor: function( children, callback ) {

         var self = this,
             sync = _.compact( _.map( children, function( v ) { return Fiber.getPromise( v ); } ) );

         $.when.apply( this, sync ).done( function() {
            callback.apply( self, arguments );
         });
      },

      /**
      *  Used by connect() to create DOM nodes.  Override to generate something
      *  different.
      */
      factory: function( vmid ) {
         return $('<div>').attr( 'data-view', vmid ).appendTo( this.$el );
      },

      /**
      *  Redefined the standard initialize view function.  Don't override this
      *  unless you know what you're doing.  Override setup() instead to add your
      *  own custom creation logic.
      */
      initialize: function( options ) {

         this.$el.on( 'destroyed', _.bind( this.remove, this ) );
         this.options = options || {};

         this.children = [];
         this.setup( options );
         this.bindData();

         this.trigger('created');
      },

      /**
      *  Internal function to unbind any listenTos on the data
      *  Any custom setData functions need to call this or write their own version.
      */
      unbindData: function() {
         var dm = this.data();
         if ( dm.trigger )
            this.stopListening( dm );
      },

      /**
      *  Internal function to examine the events hash and
      *  look for *.data keys.  Will bind the function identified in the value
      *  to the whatever is defined by the data() function (as long as it has a
      *  trigger function)..
      */
      bindData: function() {

         var self = this,
             dm = this.data();

         if ( dm.trigger ) {

            _.each( this.events, function( method, event ) {

               var idx;

               if ( (idx = event.indexOf( '.data' ) ) > -1 ) {

                  method = $.isFunction( method ) ? method : self[method];
                  self.listenTo( dm, event.slice( 0, idx ), method );
               }
            });
         }
      },

      /**
      *  Override this as necessary
      */
      setup: $.noop,

      /**
      *  Leave this alone.  Use before/after render callbacks instead or bind to the
      *  rendering/rendered events.  Upon rendering, the function will look for children
      *  with a data-view attribute and start connecting views recursively.
      */
      render: function() {

         var data, isa;

         if ( this.beforeRender() !== false ) {

            this.trigger('rendering');

            if ( this.template && typeof(this.template) == 'function' ) {
               data = this.dataSerialized();
               isa = data && $.isArray( data );

               if ( ( this.forceRender || this.renderedOnce ) && data || ( !this.renderedOnce && ( ( isa && data.length > 0 ) || !isa ) ) )
               {
                  this.$el.empty().html( this.template( data ) );
                  this.renderedOnce = true;

                  this.$el.find( '[data-view]' ).each( function() {
                     connect( this );
                  });
               }
            }

            this.afterRender();
            this.trigger('rendered');
         }

      },

      /**
      *  Add logic that should happen before rendering.  Return false to cancel rendering
      */
      beforeRender: $.noop,

      /**
      *  Add post rendering logic here.
      */
      afterRender: $.noop,

      /**
      *  Default logic to decide what defines the data object used by the
      *  view.  Override if you need something special.
      */
      data: function() {

         if ( this.model )
            return this.model;
         else if ( this.collection )
            return this.collection;
         else
            return {};
      },

      /**
      *  Default logic to set data on the view.  Takes a hash with either model or collection set to the new data value.
      *  Any custom functions must ensure they properly bind and unbind data.  The trigger is optional.
      *  Returns itself for chaining.
      */

      setData: function( data ) {

         var dm = null;

         this.unbindData();

         if ( data.model )
            this.model = dm = data.model;
         else if ( data.collection )
            this.collection = dm = data.collection;

         this.bindData();

         if (dm && dm.trigger) { dm.trigger( 'ready', dm, this );}
         return this;
      },

      /**
      *  Ensures the data is a object
      */
      dataSerialized: function() {

         var dm = this.data();

         if ( dm.toJSON )
            return dm.toJSON({ computedFields: true });
         else
            return dm;

      },

      /**
      *  Overwrites the normal view remove function.  Tells the parent
      *  to clean up which will call this again to finish cleaning up.
      */
      remove: function() {

         if ( this.parent ) {

           _view_inst[this.parent].removeChild( this );

         } else {

            this.destroy();
            this.trigger('removed');
            this.stopListening();
            this.$el.off( 'destroyed' );
            this.$el.remove();

            delete _view_inst[this.cid];
         }

         this._superStop();
      },

      /**
      *   Put any custom cleanup logic here
      */
      destroy: $.noop,

      trigger: function( topic, data ) {

         //console.log( this.instanceOf, arguments ); //+'.'+this.instanceOf
         if ( !this.$el.trigger( topic, { view: this, data: data || {} } ) )
            this._superStop();
      },

      /**
      *  Used internally to set the parent attribute on the view instance.
      */
      setParent: function( view ) {
         this.parent = null;
         if ( view ) this.parent = view.cid;
      },

      /**
      *  Used internally to add a child view instance
      */
      addChild: function( view ) {

         if ( !_.contains( view.cid, this.children ) ) {
            this.children.push( view.cid );
         }
      },

      /**
      *  Used internally to remove a child and ensure its cleanup.
      */
      removeChild: function( view ) {

         var idx = _.indexOf( this.children, view.cid );

         if ( idx > -1 ) {
            this.children.splice( idx, 1 );
            view.setParent( null );
            view.remove();
         }
      },

      /**
      *  Helper to retrive an array of all the child view instances
      */
      allChildren: function() {

         return (
            _.map( this.children, function( cid ) {
               return Fiber.getViewFromCid( cid );
            })
         );
      },

      /**
      *  Helper to return an array of child view instance of a given name
      */
      findChildren: function( type ) {

         return (
            _.compact(
               _.map( this.children, function( cid ) {
                  var view;
                  if ( (view = Fiber.getViewFromCid( cid )) && view.instanceOf == type )
                     return view;
               })
            )
         );


      },

      /**
      *  Helper to return view instance based on the view name or jQuery element.
      */
      findChild: function( target ) {

         var view = null;

         if ( target instanceof $ ) {

            view = Fiber.getViewFromEl( target );

         } else if ( typeof( target ) == 'string' ) {

            view = Fiber.getViewFromCid( target );
            if ( !view ) {

               for ( var i=0;i<this.children.length;i++ ) {

                  var test;
                  if ( (test = Fiber.getViewFromCid( this.children[i] )) && test.instanceOf == target )
                     view = test;

               }
            }
         }

         return view;
      },
      
      /**
      *  Determines if an element is in my view and not a child's view.
      */
      isMyElement: function( el ) {
         var $el = (el instanceof $ ? el : $(el));
         
         return $el.parents('[data-view]').first().attr('data-cid') == this.cid;
         
      }

   }]);

   return Fiber;

}));
