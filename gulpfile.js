var promise = require('es6-promise').polyfill();

var gulp = require('gulp');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var autoprefixer = require('gulp-autoprefixer');
var scssLint = require('gulp-scss-lint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var inject = require('gulp-inject');
var clean = require('gulp-clean');
var gutil = require('gulp-util');

var path = require('path');
var mainBowerFiles = require('main-bower-files');
var es = require('event-stream');

var sassPattern = 'app/resources/sass/*.scss';
var sassDevPattern = 'app/resources/sass/**/*.scss';
var jsPattern = 'app/resources/js/*.js';
var jsLibsPattern = 'app/resources/js/three/objects/*.js';
var staticFiles = ['app/resources/js/three/three.min.js', 'app/resources/images/**/*.*', 'app/favicon.ico', 'app/resources/fonts/**/*.*', 'app/**/*.php'];
var htmlFiles = ['app/**/*.html', '!app/bower_components/**/*.*', '!app/index.html'];
var indexFile = 'app/index.html';

var destination = 'public/';

gulp.task('serve', ['build'/*, 'scss-lint'*/], watcher);
gulp.task('build', ['move'], injectDep);
gulp.task('move', ['move:html'], move);
gulp.task('move:html', ['clean'], moveHtml);
gulp.task('scss-lint', lintScss);
gulp.task('styles', makeStyles);
gulp.task('styles:serve', makeStylesServe);
gulp.task('inject:serve', injectServe);
gulp.task('js', makeJs);
gulp.task('watch', watcher);
gulp.task('clean', cleanPublic);

function lintScss() {
    return gulp.src([sassDevPattern, '!**/sass/libs/*.scss'])
        .pipe(scssLint({
            config: 'lint.yml',
            filePipeOutput: 'scss-report.json'
        }))
        .pipe(gulp.dest(destination + 'scss-reports'))
}

function watcher() {
    gulp.watch(sassDevPattern, ['styles:serve']);
    gulp.watch(jsPattern, ['js']);
    gulp.watch(indexFile, ['inject:serve']);
}

function move() {
    return gulp.src(staticFiles, {base: 'app/'})
        .pipe(gulp.dest(destination));
}

function moveHtml() {
    return gulp.src(htmlFiles, {base: 'app/'})
        .pipe(gulp.dest(destination));
}

function cleanPublic() {
    return gulp.src(destination)
        .pipe(clean());
}

function makeStylesServe() {
    return gulp.src(sassPattern)
        .pipe(sass().on('error', gutil.log))
        .pipe(gulp.dest(destination + 'resources/css/'));
}

function makeStyles() {
    return gulp.src(sassPattern)
        .pipe(sass().on('error', gutil.log))
        .pipe(autoprefixer())
        .pipe(minifyCss())
        .pipe(gulp.dest(destination + 'resources/css/'));
}

function bowerFilesJs() {
    return gulp.src(mainBowerFiles('**/*.js'))
        .pipe(concat('libs.js'))
        .pipe(uglify())
        .pipe(gulp.dest(destination + 'resources/js'));
}

function bowerFilesCss() {
    return gulp.src(mainBowerFiles(['**/*.{css,scss}', '*.{css,scss}']))
        .pipe(sass())
        .pipe(concat('libs.css'))
        .pipe(minifyCss())
        .pipe(gulp.dest(destination + 'resources/css'));
}

function injectServe() {
    var transformation = {
        transform: function (filepath) {
            var suffix = '?' + Date.now();

            filepath = filepath.replace('/' + destination, '');

            if (filepath.indexOf('.css') !== -1) {
                return '<link rel="stylesheet" href="' + filepath + suffix + '">';
            }

            return '<script src="' + filepath + suffix + '"></script>';
        }
    };

    return gulp.src(indexFile)
        .pipe(inject(es.merge(
            gulp.src(destination + 'resources/js/libs.js', {read: false}),
            gulp.src(destination + 'resources/css/libs.css', {read: false})
        ), {name: 'bower', transform: transformation.transform}))
        //.pipe(inject(makeJsLibs(), {name: 'libs', transform: transformation.transform}))
        .pipe(inject(es.merge(
            makeStyles(),
            makeJs()
        ), transformation))
        .pipe(gulp.dest(destination));
}

function injectDep() {
    var transformation = {
        transform: function (filepath) {
            var suffix = '?' + Date.now();

            filepath = filepath.replace('/' + destination, '');

            if (filepath.indexOf('.css') !== -1) {
                return '<link rel="stylesheet" href="' + filepath + suffix + '">';
            }

            return '<script src="' + filepath + suffix + '"></script>';
        }
    };

    return gulp.src(indexFile)
        .pipe(inject(es.merge(
            bowerFilesJs(),
            bowerFilesCss()
        ), {name: 'bower', transform: transformation.transform}))
        // .pipe(inject(makeJsLibs(), {name: 'libs', transform: transformation.transform}))
        .pipe(inject(es.merge(
            makeStyles(),
            makeJs()
        ), transformation))
        .pipe(gulp.dest(destination));
}

function makeJs() {
    return gulp.src(jsPattern)
        .pipe(uglify())
        .pipe(gulp.dest(destination + 'resources/js'));
}

function makeJsLibs() {
    return gulp
        .src(jsLibsPattern)
        .pipe(concat('three.js'))
        .pipe(uglify())
        .pipe(gulp.dest(destination + 'resources/js'));
}
