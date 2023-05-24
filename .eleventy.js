const path = require("node:path");
const htmlmin = require("html-minifier");
const yaml = require("js-yaml");
// css
const sass = require("sass");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

module.exports = function (eleventyConfig) {
  // copy files
  eleventyConfig.addPassthroughCopy({
    // fonts
    "node_modules/@fontsource/quicksand/files": "css/files",
    // javascript
    "node_modules/vanilla-tilt/dist/vanilla-tilt.min.js": "js/vanilla-tilt.min.js",
    "src/js": "js",
    // data
    "src/dat": "dat",
    // images
    "src/img": "img",
  });

  // html
  eleventyConfig.addTransform("htmlmin", function (content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      const minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });

      return minified;
    }

    return content;
  });

  // yaml
  eleventyConfig.addDataExtension("yaml", contents => yaml.load(contents));

  // scss
  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: async function (inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      let sassResult = await sass.compileStringAsync(
        inputContent, {
        loadPaths: [
          parsed.dir || ".",
          this.config.dir.includes,
          "node_modules",
        ]
      }
      );

      return async () => {
        return sassResult.css;
      };
    }
  });
  eleventyConfig.addTransform("postcss", async function (content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".css")) {
      let postCssResult = await postcss([
        autoprefixer,
        cssnano,
      ]).process(content, { from: this.page.outputPath });

      return postCssResult.css
    }

    return content;
  });

  return {
    htmlTempalteEngine: "njk",
    dir: {
      input: "src",
      output: "dist",
    },
  }
}
