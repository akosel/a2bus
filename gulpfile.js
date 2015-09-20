var gulp = require('gulp');
var babel = require('babelify');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var browserify = require('browserify');
var source = require('vinyl-source-stream');

gulp.task('sass', function () {
  gulp.src('./project/client/styles/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./dist'));
});


gulp.task('sass:watch', function () {
  gulp.watch('./project/client/styles/**/*.scss', ['sass']);
});

gulp.task('browserify', function() {
  browserify('./project/client/scripts/client.js', { debug: true })
    .transform(babel)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['browserify', 'sass']);
