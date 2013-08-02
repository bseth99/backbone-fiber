(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define(['jquery', 'underscore', 'backbone', 'base'], factory);
    } else {
        // Browser globals
        root.Backbone.Fiber = factory(root.$, root._, root.Backbone, Base);
    }
}(this, function ($, _, Backbone, Base) {

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

      viewPath: 'views/',

      getViewFromEl: function( el ) {
         var $el = $( el ),
             dataCid = $el.attr( 'data-cid' ) || $el.closest( '[data-cid]' ).attr( 'data-cid' );

         if ( dataCid ) return _view_inst[dataCid];
      },

      getViewFromCid: function( cid ) {

         return _view_inst[cid];
      },

      getElFromCid: function( cid ) {

         if ( _view_inst[cid] )
            return _view_inst[cid].$el;
      },

      getPromise: function( view ) {

         if ( _view_loading[view] )
            return _view_loading[view];
      }
   }

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

   function create( view, $el, options ) {

      var inst = new view(_.extend( options, { el: $el[0] } )),
          parent;

      $el.attr( 'data-cid', inst.cid );
      _view_inst[inst.cid] = inst;

      parent = $el.parent().closest( '[data-view]' );
      if ( parent.length > 0 ) {
         parent = parent.attr( 'data-cid' );
         _view_inst[parent].addChild( inst );
         inst.setParent( _view_inst[parent] );
      }

      inst.render();
      return inst;
   }

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

      template: null,

      parent: null,
      children: null,

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

      waitFor: function( children, callback ) {

         var self = this,
             sync = _.compact( _.map( children, function( v ) { return Fiber.getPromise( v ); } ) );

         $.when.apply( this, sync ).done( function() {
            callback.apply( self, arguments );
         });
      },

      factory: function( vmid ) {
         return $('<div>').attr( 'data-view', vmid ).appendTo( this.$el );
      },

      initialize: function( options ) {

         this.$el.on( 'destroyed', _.bind( this.remove, this ) );

         this.children = [];
         this.setup();
         this.bindData();

         this.trigger('created');
      },

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

      setup: $.noop,

      render: function() {

         var data, isa;

         if ( this.beforeRender() !== false ) {

            this.trigger('rendering');

            if ( this.template && typeof(this.template) == 'function' ) {
               data = this.dataSerialized();
               isa = data && $.isArray( data );

               if ( data && ( ( isa && data.length > 0 ) || !isa ) )
               {
                  this.$el.empty().html( this.template( data ) );

                  this.$el.children().find( '[data-view]' ).each( function() {
                     connect( this );
                  });
               }
            }

            this.afterRender();
            this.trigger('rendered');
         }

      },

      beforeRender: $.noop,
      afterRender: $.noop,

      data: function() {

         if ( this.model )
            return this.model;
         else if ( this.collection )
            return this.collection;
         else
            return {};
      },

      dataSerialized: function() {

         var dm = this.data();

         if ( dm.toJSON )
            return dm.toJSON();
         else
            return dm;

      },

      remove: function() {

         this.destroy();

         if ( this.parent ) {

           _view_inst[this.parent].removeChild( this );

         } else {

            this.trigger('removed');
            this.stopListening();

            delete _view_inst[this.cid];
         }

         this._superStop();
      },

      destroy: $.noop,

      trigger: function( topic, data ) {

         //console.log( this.instanceOf, arguments );
         if ( !this.$el.trigger( topic+'.'+this.instanceOf, { view: this, data: data || {} } ) )
            this._superStop();
      },

      setParent: function( view ) {
         this.parent = null;
         if ( view ) this.parent = view.cid;
      },

      addChild: function( view ) {

         if ( !_.contains( view.cid, this.children ) ) {
            this.children.push( view.cid );
         }
      },

      removeChild: function( view ) {

         var idx = _.indexOf( this.children, view.cid );

         if ( idx > -1 ) {
            this.children.splice( idx, 1 );
            view.setParent( null );
            view.remove();
         }
      },

      allChildren: function() {

         return (
            _.map( this.children, function( cid ) {
               return Fiber.getViewFromCid( cid );
            })
         );
      },

      findChildren: function( type ) {

         return (
            _.compact(
               _.map( this.children, function( cid ) {
                  var view;
                  if ( (view = Fiber.getViewFromCid( this.children[i] )) && view.instanceOf == type )
                     return view;
               })
            )
         );


      },

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
      }

   }]);

   return Fiber;

}));
