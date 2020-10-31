/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const browserify = require('browserify');
const browserSync = require('browser-sync');
const buffer = require('vinyl-buffer');
const source  = require('vinyl-source-stream');
const childProcess = require('child-process-promise');
const concat = require('gulp-concat');
const del = require('del');
const filter = require('gulp-filter');
const fs = require('fs');
const {parallel, series, src, dest, watch} = require('gulp');
const gutil = require('gulp-util');
const Immutable = require('../');
const gulpLess = require('gulp-less');
const mkdirp = require('mkdirp');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const reactTools = require('react-tools');
const size = require('gulp-size');
const sourcemaps = require('gulp-sourcemaps');
const through = require('through2');
const uglify = require('gulp-uglify');
const vm = require('vm');
const rename = require('gulp-rename');
const semver = require('semver');


function requireFresh(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

const SRC_DIR = '../pages/src/';
const BUILD_DIR = '../pages/out/';

function clean() {
  return del([BUILD_DIR], {force: true});
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

function execPromise(command) {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, out) => (error ? reject(error) : resolve(out)));
  });
}

function typedefs(done) {
  mkdirp.sync('../pages/generated/type-definitions');

  let latestTag;

  childProcess.exec('git tag --list --sort="-v:refname"').then(function (gitTagResult) {
    const tags = gitTagResult.stdout.split('\n')
      .filter(tag => semver.valid(semver.coerce(tag)))
      .filter(tag => semver.gte(tag, '3.0.0')) // Anything below 3.0 does not compile with this gulp script
      .sort((tagA, tagB) => 0 - semver.compare(semver.clean(tagA), semver.clean(tagB)));
    latestTag = tags[0];

    const tagsObj = {};

    tags.forEach(tag => {
      const label = `${semver.major(tag)}.${semver.minor(tag)}`;

      if (!tagsObj[label]) {
        tagsObj[label] = tag;
      }
    });

    // take latest 20 major.minor releases (take latest patch version, including release candidates)
    const sortedVersions = Object.entries(tagsObj)
      .sort((entryA, entryB) => {
        const tagA = semver.clean(entryA[1]);
        const tagB = semver.clean(entryB[1]);

        return 0 - semver.compare(semver.clean(tagA), semver.clean(tagB));
      })
      .slice(0, 20);

    tagsObj[latestTag] = latestTag;

    return Promise.all(Object.entries(tagsObj).map(([docName, tag]) =>
      childProcess
        .exec(`git show ${tag}:type-definitions/Immutable.d.ts`)
        .then(function (gitShowResult) {
          const defPath = '../pages/generated/type-definitions/Immutable' +
            (docName !== latestTag ? '-' + docName : '') +
            '.d.ts';
          fs.writeFileSync(defPath, gitShowResult.stdout, 'utf8');
          return [docName, defPath, tag];
        })
    ));
  }).then(function (tagEntries) {
    const failedVersions = [];
    tagEntries.forEach(function ([docName, typeDefPath, tag]) {
      gutil.log('Build type defs for version', docName, `(${tag})`);
      const fileContents = fs.readFileSync(typeDefPath, 'utf8');

      const fileSource = fileContents.replace(
        'module \'immutable\'',
        'module Immutable'
      );

      const writePath = path.join(
        __dirname,
        '../pages/generated/immutable' +
        (docName !== latestTag ? '-' + docName : '') +
        '.d.json'
      );

      try {
        const genTypeDefData = requireFresh('../pages/lib/genTypeDefData');
        const defs = genTypeDefData(typeDefPath, fileSource);
        defs.Immutable.version = /^v?(.*)/.exec(tag)[1];
        const contents = JSON.stringify(defs);

        mkdirp.sync(path.dirname(writePath));
        fs.writeFileSync(writePath, contents);
      } catch (e) {
        console.error('Unable to build version ' + docName + ':', e.message);
        failedVersions.push([docName, e]);
      }
    });

    if (failedVersions.length) {
      failedVersions.forEach(([ver]) => console.log('Failed version', ver));
      throw failedVersions[0][1];
    }
  })
    .then(() => done())
    .catch(error => done(error));
}

function js() {
  return gulpJS('');
}

function jsDocs() {
  return gulpJS('docs/');
}

function gulpJS(subDir) {
  // You don't need the es2015 preset package, but you should use because you don't hate yourself enough to write old JavaScript
  const root = path.join(SRC_DIR, subDir, 'src/index.js');
  return browserify(root, { debug:true })
    .transform('babelify', {
      presets: [
        ["@babel/preset-env", { targets: "> 0.25%, not dead" }],
        "@babel/preset-react",
      ],
    })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('.'))
    .pipe(dest(BUILD_DIR + subDir))
    .on('error', handleError);
/*
  return src(SRC_DIR + subDir + '/ * * / *.js')
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [
        ["@babel/preset-env", { targets: "> 0.25%, not dead", modules: "umd" }],
        "@babel/preset-react",
      ]
    }))
    .pipe(concat("bundle.js"))
    .pipe(sourcemaps.write("."))
    .pipe(dest(BUILD_DIR + subDir))
    .on('error', handleError);
*/
}

function preRender() {
  return gulpPreRender('');
}

function preRender() {
  return gulpPreRender({
    html: 'index.html',
    src: 'readme.json',
  });
}

function preRenderDocs() {
  return gulpPreRender({
    html: 'docs/index.html',
    src: 'immutable.d.json',
  });
}

function preRenderVersioned() {
  return gulpPreRender({
    html: 'index.html',
    src: 'readme-*.json',
  });
}

function preRenderVersionedDocs() {
  return gulpPreRender({
    html: 'docs/index.html',
    src: 'immutable-*.d.json',
  });
}

function gulpPreRender(options) {
  return src(path.join('../pages/generated', options.src))
    .pipe(reactPreRender(options.html))
    .pipe(size({showFiles: true}))
    .pipe(rename(function (path) {
      let suffix = '';
      const match = /-(\d+\.\d+)\.d$/.exec(path.basename);
      if (match) {
        suffix = match[1];
      }
      path.dirname = '';
      path.basename = suffix || 'index';
      path.extname = '.html';
    }))
    .pipe(dest(path.join(BUILD_DIR, path.dirname(options.html))))
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
    .pipe(size({showFiles: true}))
    .pipe(browserSync.reload({stream: true}))
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
    .pipe(browserSync.reload({stream: true}))
    .on('error', handleError);
}

function immutableCopy() {
  return src('../dist/immutable.js')
    .pipe(dest(BUILD_DIR))
    .on('error', handleError)
    .pipe(browserSync.reload({stream: true}))
    .on('error', handleError);
}


function gulpJsonp() {
  return through.obj(function (file, enc, cb) {
    var jsonp = 'window.data = JSON.parse(' + JSON.stringify(file.contents.toString()) + ');';
    file.contents = Buffer.from(jsonp, enc);
    this.push(file);
    cb();
  });
}

function jsonpTask() {
  return src(['../pages/generated/immutable-*.d.json', '../pages/generated/immutable.d.json'])
    .pipe(gulpJsonp())
    .pipe(rename(function (path) {
      path.extname = '.jsonp';
    }))
    .pipe(dest(path.join(BUILD_DIR, 'docs/defs')))
    .on('error', handleError)
    .pipe(browserSync.reload({stream: true}))
    .on('error', handleError);
}

const build = series(
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
  const srcHtml = fs.readFileSync(path.join('../pages/src', htmlPath), 'utf8');
  const subDir = path.dirname(htmlPath);
  console.log('reactPreRender', htmlPath, subDir);

  return through.obj(function (file, enc, cb) {
    const data = JSON.parse(file.contents.toString(enc));
    var components = [];

    var suffixMatch = /-\d+\.\d+(?=\.d\.json)/.exec(file.path);
    var suffix = suffixMatch ? suffixMatch[0] : '';

    var html = srcHtml.replace(/<!--\s*React\(\s*(.*?)\s*\)\s*-->/g,
      (_, relComponent) => {
        var id = 'r' + components.length;
        var component = path.resolve(SRC_DIR, subDir, relComponent);
        components.push(component);
        try {
          const content = fs.readFileSync(path.join(BUILD_DIR, subDir, 'bundle.js'));

          const rendered = vm.runInNewContext(content
            //+ // ugly
            //'\nReactDOMServer.renderToString(' +
            //'React.createElement(require(component)))',
            ,
            {
              global: {
                React: React,
                Immutable: Immutable,
                data: data,
                ReactDOMServer,
              },
              window: {},
              component: component,
              console: console,
              require,
              ReactDOMServer,
              React: React,
            }
          );

          return `<div id="${id}">${rendered}</div>`;
        } catch (error) {
          console.log('failed to render target', error);
          return '<div id="' + id + '">' + error.message + '</div>';
        }
      }).replace(
      '<!-- JSONP(defs/immutable.d.jsonp) -->',
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
    file.contents = Buffer.from(html, enc);
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
    function (done) {
      try {
        this.push(reactTools.transform(code, {harmony: true}));
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
