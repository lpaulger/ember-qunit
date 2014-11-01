var concat     = require('broccoli-concat');
var pickFiles  = require('broccoli-static-compiler');
var mergeTrees = require('broccoli-merge-trees');
var compileES6 = require('broccoli-es6-concatenator');
var jshintTree = require('broccoli-jshint');
var replace    = require('broccoli-string-replace');
var gitInfo    = require('git-repo-info');

// --- Compile ES6 modules ---

var loader = pickFiles('bower_components', {
  srcDir: 'loader',
  files: ['loader.js'],
  destDir: '/assets/'
});

// TODO - this manual dependency management has got to go!
var klassy = pickFiles('bower_components', {
  srcDir: '/klassy/lib',
  files: ['klassy.js'],
  destDir: '/'
});
var emberTestHelpers = pickFiles('bower_components', {
  srcDir: '/ember-test-helpers/lib',
  files: ['**/*.js'],
  destDir: '/'
});
var deps = mergeTrees([klassy, emberTestHelpers]);

var lib = pickFiles('lib', {
  srcDir: '/',
  files: ['**/*.js'],
  destDir: '/'
});

var tests = pickFiles('tests', {
  srcDir: '/',
  files: ['test-support/*.js', '*.js'],
  destDir: '/tests'
});

var main = mergeTrees([deps, lib]);
main = compileES6(main, {
  inputFiles: ['**/*.js'],
  ignoredModules: ['ember'],
  outputFile: '/ember-qunit.amd.js',
  wrapInEval: false
});

var generatedBowerConfig = pickFiles('build-support', {
  srcDir: '/',
  destDir: '/',
  files: ['bower.json']
});
generatedBowerConfig = replace(generatedBowerConfig, {
  files: ['bower.json'],
  pattern: {
    match: /VERSION_PLACEHOLDER/,
    replacement: function() {
      return gitInfo().abbreviatedSha;
    }
  }
});

var globalizedBuildSupport = pickFiles('build-support', {
  srcDir: '/',
  files: ['iife-start.js', 'globalize.js', 'iife-stop.js'],
  destDir: '/'
});

var globalizedMain = concat(mergeTrees([loader, main, globalizedBuildSupport]), {
  inputFiles: ['iife-start.js', 'assets/loader.js', 'ember-qunit.amd.js', 'globalize.js', 'iife-stop.js'],
  outputFile: '/ember-qunit.js'
});

var jshintLib = jshintTree(lib);
var jshintTest = jshintTree(tests);

var mainWithTests = mergeTrees([deps, lib, tests, jshintLib, jshintTest]);
mainWithTests = compileES6(mainWithTests, {
  inputFiles: ['**/*.js'],
  ignoredModules: ['ember'],
  outputFile: '/assets/ember-qunit-tests.amd.js'
});

// --- Select and concat vendor / support files ---

var vendor = concat('bower_components', {
  inputFiles: [
    'jquery/dist/jquery.js',
    'handlebars/handlebars.js',
    'ember/ember.js',
    'ember-data/ember-data.js'
  ],
  outputFile: '/assets/vendor.js'
});

var qunit = pickFiles('bower_components', {
  srcDir: '/qunit/qunit',
  files: ['qunit.js', 'qunit.css'],
  destDir: '/assets'
});

var testIndex = pickFiles('tests', {
  srcDir: '/',
  files: ['index.html'],
  destDir: '/tests'
});

var testSupport = concat('bower_components', {
  inputFiles: ['ember-cli-shims/app-shims.js',
    'ember-cli-test-loader/test-loader.js'],
  outputFile: '/assets/test-support.js'
});

module.exports = mergeTrees([loader, main, mainWithTests, globalizedMain, vendor, testIndex, qunit, testSupport, generatedBowerConfig]);
