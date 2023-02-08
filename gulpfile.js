const { src, dest, parallel, watch } = require("gulp");
// util
const sourcemaps = require("gulp-sourcemaps");
const gulpif = require("gulp-if");
// css
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");
// img
const responsive = require("gulp-responsive");
const image = require("gulp-image");

const scripts = [
  "./node_modules/vanilla-tilt/dist/vanilla-tilt.min.js",
  "./src/js/**/*.js",
];

const prod_env = process.env.NODE_ENV === "production";
const dev_env = process.env.NODE_ENV === "development" || !prod_env;

function css_fonts() {
  return src("./node_modules/@fontsource/quicksand/files/**/*")
    .pipe(dest("dist/css/files/"));
}

function css_postcss() {
  const sassConfig = {
    includePaths: [
      "./node_modules/",
    ],
  };

  return src("./src/_scss/index.scss")
    .pipe(gulpif(dev_env, sourcemaps.init()))
      .pipe(sass(sassConfig))
      .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(gulpif(dev_env, sourcemaps.write(".")))
    .pipe(dest("./dist/css/"));
}

function js() {
  return src(scripts)
    .pipe(dest("dist/js/"));
}

function img() {
  const imageConfig = {
    svgo: false,
  };
  const responsiveConfig = {
    errorOnUnusedImage: false,
    passThroughUnused: true,
    silent: true,
  };

  return src("./src/img/**/*")
    .pipe(responsive({
      "experience/*": {
        width: 72*2,
      },
    }, responsiveConfig))
    .pipe(image(imageConfig))
    .pipe(dest("./dist/img/"));
}

function dat() {
  return src("./src/dat/**/*")
    .pipe(dest("./dist/dat/"));
}

function watch_task() {
  watch("./src/_scss/**/*", css_postcss);
  watch("./src/js/**/*", js);
  watch("./src/img/**/*", img);
  watch("./src/dat/**/*", dat);
}

exports.css = parallel(css_fonts, css_postcss);
exports.js = js;
exports.img = img;
exports.dat = dat;
exports.watch = watch_task;
exports.build = parallel(
  exports.css,
  exports.js,
  exports.img,
  exports.dat,
);
exports.default = exports.build;
