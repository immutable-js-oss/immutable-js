/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const browserify = require('browserify');
const browserSync = require('browser-sync');
const buffer = require('vinyl-buffer');
const childProcess = require('child-process-promise');
const concat = require('gulp-concat');
const del = require('del');
const filter = require('gulp-filter');
const fs = require('fs');
const { parallel, series, src, dest, watch } = require('gulp');
const gutil = require('gulp-util');
const Immutable = require('../');
const gulpLess = require('gulp-less');
const git = require('gulp-git')
const mkdirp = require('mkdirp');
const path = require('path');
const React = require('react/addons');
const reactTools = require('react-tools');
const size = require('gulp-size');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const through = require('through2');
const uglify = require('gulp-uglify');
const vm = require('vm');
const rename = require('gulp-rename');
const semver = require('semver');
const markdownDocs = require('../pages/lib/markdownDocs');


function requireFresh(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

const SRC_DIR = '../pages/src/';
const BUILD_DIR = '../pages/out/';

function clean() {
  return del([BUILD_DIR], { force: true });
}

function readme(done) {
  const genMarkdownDoc = requireFresh('../pages/lib/genMarkdownDoc');

  const readmePath = path.join(__dirname, '../README.md');

  const fileContents = fs.readFileSync(readmePath, 'utf8');

  const writePath = path.join(__dirname, '../pages/generated/readme.json');
  const contents = JSON.stringify(genMarkdownDoc(fileContents));

  mkdirp.sync(path.dirname(writePath));
  fs.writeFileSync(writePath, contents);
  done();
}

function typedefs(done) {
  mkdirp.sync('../pages/generated/type-definitions');

  let result = '';
  let latestTag;

  childProcess.exec("git tag").then(function(result) {
    var tags = result.stdout.split("\n")
      .filter(function(tag) { return semver.valid(tag) })
      .sort(function(tagA, tagB) { return semver.compare(tagA, tagB) });

    latestTag = tags[tags.length - 1];

    var tagsObj = {};

    tags.forEach(function (tag) {
      if (!semver.prerelease(tag)) {
        tagsObj[semver.major(tag) + '.' + semver.minor(tag)] = tag;
      }
    });

    tagsObj[latestTag] = latestTag;

    Promise.all(Object.entries(tagsObj).map(function (tagEntry) {
      const docName = tagEntry[0];
      const tag = tagEntry[1];

      return childProcess
        .exec("git show " + tag + ":" + "type-definitions/Immutable.d.ts")
        .then(function (result) {
          const defPath = '../pages/generated/type-definitions/Immutable' +
           (docName !== latestTag ? '-' + docName : '') +
           '.d.ts';
          fs.writeFileSync(defPath, result.stdout, 'utf8');
          return [docName, {
            path: defPath,
            tag: tag,
          }];
        });
    }));
  }).then(function(tagEntries) {
    var genTypeDefData = requireFresh('../pages/lib/genTypeDefData');

    tagEntries.forEach(function (tagEntry) {
      var docName = tagEntry[0];
      var typeDefPath = tagEntry[1].path;
      var tag = tagEntry[1].tag;
      var fileContents = fs.readFileSync(typeDefPath, 'utf8');

    const fileSource = fileContents.replace(
        "module 'immutable'",
        'module Immutable'
      );

      var writePath = path.join(
          __dirname,
          '../pages/generated/immutable' +
          (docName !== latestTag ? '-' + docName : '') +
          '.d.json'
      );

      try {
        var defs = genTypeDefData(typeDefPath, fileSource);
        markdownDocs(defs);
        defs.Immutable.version = /^v?(.*)/.exec(tag)[1];
        var contents = JSON.stringify(defs);


        mkdirp.sync(path.dirname(writePath));
        fs.writeFileSync(writePath, contents);
      } catch(e) {
        console.error('Unable to build verion ' + docName + ':');
        console.error(e.message);
      }
    });
    done();
  });
});

function js() {
  return gulpJS('');
}

function jsDocs() {
  return gulpJS('docs/');
}

function gulpJS(subDir) {
  const reactGlobalModulePath = path.relative(
    path.resolve(SRC_DIR + subDir),
    path.resolve('./react-global.js')
  );
  const immutableGlobalModulePath = path.relative(
    path.resolve(SRC_DIR + subDir),
    path.resolve('./immutable-global.js')
  );
  return (
    browserify({
      debug: true,
      basedir: SRC_DIR + subDir,
    })
      .add('./src/index.js')
      .require('./src/index.js')
      .require(reactGlobalModulePath, { expose: 'react' })
      .require(immutableGlobalModulePath, { expose: 'immutable' })
      // Helpful when developing with no wifi
      // .require('react', { expose: 'react' })
      // .require('immutable', { expose: 'immutable' })
      .transform(reactTransformify)
      .bundle()
      .on('error', handleError)
      .pipe(source('bundle.js'))
      .pipe(buffer())
      .pipe(
        sourcemaps.init({
          loadMaps: true,
        })
      )
      //.pipe(uglify())
      .pipe(sourcemaps.write('./maps'))
      .pipe(dest(BUILD_DIR + subDir))
      .pipe(filter('**/*.js'))
      .pipe(size({ showFiles: true }))
      .on('error', handleError)
  );
}

function preRender() {
  return gulpPreRender('');
}

function preRender() {
  return gulpPreRender({
    html: 'index.html',
    src: 'readme.json',
  })
}

function preRenderDocs() {
  return gulpPreRender({
    html: 'docs/index.html',
    src: 'immutable.d.json',
  })
}

function preRenderVersioned() {
  return gulpPreRender({
    html: 'index.html',
    src: 'readme-*.json',
  })
}

function preRenderVersionedDocs() {
  return gulpPreRender({
    html: 'docs/index.html',
    src: 'immutable-*.d.json',
  })
}

function gulpPreRender(options) {
  return src(path.join('../pages/generated', options.src))
    .pipe(reactPreRender(options.html))
    .pipe(size({ showFiles: true }))
    .pipe(rename(function (path) {
      var suffix = "";
      var match;
      if (match = /-(\d+\.\d+)\.d$/.exec(path.basename)) {
        suffix = match[1];
      }
      path.basename = suffix || 'index';
      path.extname = '.html';
    }))
    .pipe(gulp.dest(path.join(BUILD_DIR, path.dirname(options.html))))
    .pipe(dest(BUILD_DIR + subDir))
    .on('error', handleError);
}

function less() {
  return gulpLessTask('');
}

function lessDocs() {
  return gulpLessTask('docs/');
}

function gulpLessTask(subDir) {
  return src(SRC_DIR + subDir + 'src/*.less')
    .pipe(sourcemaps.init())
    .pipe(
      gulpLess({
        compress: true,
      })
    )
    .on('error', handleError)
    .pipe(concat('bundle.css'))
    .pipe(sourcemaps.write('./maps'))
    .pipe(dest(BUILD_DIR + subDir))
    .pipe(filter('**/*.css'))
    .pipe(size({ showFiles: true }))
    .pipe(browserSync.reload({ stream: true }))
    .on('error', handleError);
}

function statics() {
  return gulpStatics('');
}

function staticsDocs() {
  return gulpStatics('docs/');
}

function gulpStatics(subDir) {
  return src(SRC_DIR + subDir + 'static/**/*')
    .pipe(dest(BUILD_DIR + subDir + 'static'))
    .on('error', handleError)
    .pipe(browserSync.reload({ stream: true }))
    .on('error', handleError);
}

function immutableCopy() {
  return src('../dist/immutable.js')
    .pipe(gulp.dest(BUILD_DIR))
    .on('error', handleError)
    .pipe(browserSync.reload({ stream: true }))
    .on('error', handleError);
}


function gulpJsonp() {
  return through.obj(function(file, enc, cb) {
    var jsonp = 'window.data = JSON.parse(' + JSON.stringify(file.contents.toString()) + ');';
    file.contents = new Buffer(jsonp, enc);
    this.push(file);
    cb();
  });
}

function jsonpTask() {
  return src(['../pages/generated/immutable-*.d.json', '../pages/generated/immutable.d.json'])
    .pipe(gulpJsonp())
    .pipe(rename(function(path) {
      path.extname = ".jsonp";
    }))
    .pipe(gulp.dest(path.join(BUILD_DIR, "docs/defs")))
    .on('error', handleError)
    .pipe(browserSync.reload({ stream: true }))
    .on('error', handleError);
}

const build = parallel(
  typedefs,
  readme,
  series(js, jsDocs, jsonpTask, less, lessDocs, immutableCopy, statics, staticsDocs),
  series(preRender, preRenderDocs, preRenderVersioned, preRenderVersionedDocs)
);

const defaultTask = series(clean, build);

// watch files for changes and reload
function watchFiles() {
  browserSync({
    port: 8040,
    server: {
      baseDir: BUILD_DIR,
    },
  });

  watch('../README.md', build);
  watch('../pages/lib/**/*.js', build);
  watch('../pages/src/**/*.less', series(less, lessDocs));
  watch('../pages/src/src/**/*.js', rebuildJS);
  watch('../pages/src/docs/src/**/*.js', rebuildJSDocs);
  watch('../pages/src/**/*.html', series(preRender, preRenderDocs));
  watch('../pages/src/static/**/*', series(statics, staticsDocs));
  watch('../type-definitions/*', parallel(typedefs, rebuildJSDocs));
}

const dev = series(defaultTask, watchFiles);

function rebuildJS(done) {
  parallel(js, preRender, () => {
    browserSync.reload();
    done();
  });
}

function rebuildJSDocs(done) {
  parallel(jsDocs, preRenderDocs, () => {
    browserSync.reload();
    done();
  });
}

function handleError(error) {
  gutil.log(error.message);
}

function reactPreRender(htmlPath) {
  var srcHtml = fs.readFileSync(path.join('../pages/src', htmlPath), 'utf8');
  var subDir = path.dirname(htmlPath);

  return through.obj(function(file, enc, cb) {
    var data = JSON.parse(file.contents.toString(enc));
    markdownDocs(data);
    var components = [];

    var suffixMatch = /-\d+\.\d+(?=\.d\.json)/.exec(file.path);
    var suffix = suffixMatch ? suffixMatch[0] : '';

    var html = srcHtml.replace(/<!--\s*React\(\s*(.*?)\s*\)\s*-->/g,
      (_, relComponent) => {
        var id = 'r' + components.length;
        var component = path.resolve(SRC_DIR, subDir, relComponent);
        components.push(component);
        try {
          return (
            '<div id="' +
            id +
            '">' +
            vm.runInNewContext(
            fs.readFileSync(path.join(BUILD_DIR, subDir, 'bundle.js')) + // ugly
                '\nrequire("react").renderToString(' +
                'require("react").createElement(require(component)))',
              {
                global: {
                  React: React,
                  Immutable: Immutable,
                data: data,
                },
                window: {},
                component: component,
                console: console,
              }
            ) +
            '</div>'
          );
        } catch (error) {
          return '<div id="' + id + '">' + error.message + '</div>';
        }
    }).replace(
      "<!-- JSONP(defs/immutable.d.jsonp) -->",
      '<script src="defs/immutable' + suffix + '.d.jsonp"></script>'
    );

    if (components.length) {
      html = html.replace(
        /<!--\s*ReactRender\(\)\s*-->/g,
        '<script>' +
          components.map((component, index) => {
            return (
              'var React = require("react");' +
              'React.render(' +
              'React.createElement(require("' +
              component +
              '")),' +
              'document.getElementById("r' +
              index +
              '")' +
              ');'
            );
          }) +
          '</script>'
      );
    }
    file.contents = new Buffer.from(html, enc);
    this.push(file);
    cb();
  });
}

function reactTransformify(filePath) {
  if (path.extname(filePath) !== '.js') {
    return through();
  }
  let code = '';
  let parseError;
  return through.obj(
    (file, enc, cb) => {
      code += file;
      cb();
    },
    function(done) {
      try {
        this.push(reactTools.transform(code, { harmony: true }));
      } catch (error) {
        parseError = new gutil.PluginError('transform', {
          message: error.message,
          showStack: false,
        });
      }
      parseError && this.emit('error', parseError);
      done();
    }
  );
}

exports.dev = dev;
exports.default = defaultTask;
