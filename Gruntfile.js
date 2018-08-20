module.exports = function( grunt ) {

grunt.initConfig({

   pkg: '<json:package.json>',

   meta: {
      banner: "/*! <%= pkg.name %>: <%= pkg.title %> (v<%= pkg.version %> built <%= grunt.template.today('isoDate') %>)\n" +
              "<%= pkg.homepage ? '* ' + pkg.homepage + '\n' : '' %>" +
              "* Copyright <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>;" +
              " Licensed <%= _.pluck(pkg.licenses, 'type').join(', ') %> */"
   },

   concat: {
      dist: {
         src: [ "src/backbone-fiber.js" ],
         dest: "backbone-fiber.js"
      }
   },

   uglify: {
      "backbone-fiber.min.js": [ "<banner>", "backbone-fiber.js" ]
   }

});

grunt.loadNpmTasks( "grunt-contrib-uglify" );
grunt.loadNpmTasks( "grunt-contrib-concat" );

grunt.registerTask( "default", [ "concat", "uglify" ] );

};
