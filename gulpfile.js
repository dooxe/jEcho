var
    gulp            = require("gulp"),
    ts              = require("gulp-typescript"),
    uglify          = require('gulp-uglify'),
    sh              = require('shelljs'),
    watch           = require('gulp-watch'),
    rename          = require('gulp-rename'),
    gulpSequence    = require('gulp-sequence'),
    fs              = require('fs'),
    path            = require('path'),
    concat          = require('gulp-concat')
;

//
var tsProject   = ts.createProject("tsconfig.json");

//
//
//
gulp.task('default', () => {
    return tsProject.src()
        .pipe(tsProject())
        .js
        .pipe(gulp.dest('build'));
});

//
//
//
gulp.task('watch', function ()
{
    return watch('src/**/*.(ts|js)', function ()
    {
        gulp.start('default');
    });
});

//
//
//
gulp.task('license', function()
{
    return gulp.src(['./src/license.js','./dist/jecho.min.js'])
        .pipe(concat('jecho.min.js'))
        .pipe(gulp.dest('./dist/'));
});

//
//
//
gulp.task('uglify', () => {
    return gulp.src('build/*.js')
        .pipe(uglify({

        }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest("dist"))
    ;
});

//
//
//
gulp.task('makedoc', ()=>{
    if (sh.exec('yuidoc').code !== 0)
    {
        sh.echo('Error: yuidoc failed');
        sh.exit(1);
    }
    gulp.src(['dist/jecho.min.js'])
        .pipe(gulp.dest('docs/assets/js'))
    ;
    return gulp.src(['docs/assets/images/logo.png'])
        .pipe(gulp.dest('docs/api/assets/'))
    ;
});

//
//
//
gulp.task('doc', gulpSequence('default','makedoc'));

//
//
//
gulp.task('dist', gulpSequence('default','uglify','license','makedoc'));
