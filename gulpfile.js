var gulp = require('gulp');
var gutil = require('gulp-util');
var path = require('path');
var babel = require('babelify');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');

var PROJECT_DIR = './project';
var BUILD_DIR = './dist';

function standardHandler(err) {
  gutil.log(gutil.colors.red('Error'), err.message);
}

function browserifyHandler(err) {
  standardHandler(err);
  // this.end(); // TODO this doesn't have the end method. Probably need to explicitly bind stream.
}

gulp.task('sass', function () {
  return gulp.src(path.join(PROJECT_DIR, 'client/styles/**/*.scss'))
    .pipe(sass())
    .on('error', gutil.log.bind(gutil, 'Sass error'))
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('sass:watch', function () {
  return gulp.watch(path.join(PROJECT_DIR, 'client/styles/**/*.scss'), ['sass']);
});

gulp.task('watchify', function() {
  var b = watchify(browserify({
    entries: [path.join(PROJECT_DIR, 'client/scripts/client.js')],
    debug: true
  }));

  b.transform(babel);

  b.on('update', rebundle);
  b.on('error', browserifyHandler);
  b.on('log', gutil.log.bind(gutil));

  function rebundle() {
    return b.bundle()
      .on('error', browserifyHandler)
      .pipe(source('bundle.js'))
      .pipe(gulp.dest(BUILD_DIR));
  }

  return rebundle();
});

gulp.task('default', ['sass', 'sass:watch', 'watchify']);
