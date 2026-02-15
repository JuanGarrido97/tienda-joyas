const { src, dest, watch, series } = require('gulp');
const sass = require('gulp-sass')(require('sass'));

function css() {
  return src('assets/scss/app.scss')
    .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
    .pipe(dest('assets/css'));
}

function watchFiles() {
  watch('assets/scss/**/*.scss', css);
}

exports.default = series(css, watchFiles);
