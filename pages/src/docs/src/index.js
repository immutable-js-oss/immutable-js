/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import createClass from 'create-react-class';
import PropTypes from 'prop-types';

import { Router, Route, RouteHandler } from 'react-router-dom';
import DocHeader from './DocHeader';
import DocSearch from './DocSearch.js';
import TypeDocumentation from './TypeDocumentation';
const defs = global.data; // injected by gulp

// TODO DO NOT MERGE: Fix the stupid router

import '../../../lib/runkit-embed';

var Documentation = createClass({
  render() {
    return (
      <div>
        <DocHeader />
        <div className="pageBody" id="body">
          <div className="contents">
            <DocSearch />
            <RouteHandler />
          </div>
        </div>
      </div>
    );
  },
});

var DocDeterminer = createClass({
  childContextTypes: {
    router: PropTypes.object.isRequired,
  },
  render() {
    var { def, name, memberName } = determineDoc(this.context.router.getCurrentPath());
    return <TypeDocumentation def={def} name={name} memberName={memberName} />;
  },
});

function determineDoc(path) {
  var [, name, memberName] = path.split('/');

  var namePath = name ? name.split('.') : [];
  var def = namePath.reduce(
    (def, subName) => def && def.module && def.module[subName],
    defs.Immutable
  );

  return { def, name, memberName };
}

module.exports = createClass({
  childContextTypes: {
    getPageData: PropTypes.func.isRequired,
  },

  getChildContext() {
    return {
      getPageData: this.getPageData,
    };
  },

  getPageData() {
    return this.pageData;
  },

  componentWillMount() {
    var location;
    var scrollBehavior;

    if (window.document) {
      location = Router.HashLocation;
      location.addChangeListener(change => {
        this.pageData = Object.assign({}, change, determineDoc(change.path));
      });

      this.pageData = !window.document
        ? {}
        : assign(
            {
              path: location.getCurrentPath(),
              type: 'init',
            },
            determineDoc(location.getCurrentPath())
          );

      scrollBehavior = {
        updateScrollPosition: (position, actionType) => {
          switch (actionType) {
            case 'push':
              return this.getPageData().memberName
                ? null
                : window.scrollTo(0, 0);
            case 'pop':
              return window.scrollTo(
                position ? position.x : 0,
                position ? position.y : 0
              );
          }
        },
      };
    }

    Router.create({
      routes: (
        <Route handler={Documentation} path="/">
          <Route exact path="/" handler={DocDeterminer} />
          <Route name="type" path="/:name" handler={DocDeterminer} />
          <Route
            name="method"
            path="/:name/:memberName"
            handler={DocDeterminer}
          />
        </Route>
      ),
      location: location,
      scrollBehavior: scrollBehavior,
    }).run(Handler => {
      this.setState({ handler: Handler });
      if (window.document) {
        window.document.title = `${this.pageData.name} — Immutable.js`;
      }
    });
  },

  // TODO: replace this. this is hacky and probably wrong

  componentDidMount() {
    setTimeout(() => {
      this.pageData.type = '';
    }, 0);
  },

  componentDidUpdate() {
    setTimeout(() => {
      this.pageData.type = '';
    }, 0);
  },

  render() {
    var Handler = this.state.handler;
    return <Handler />;
  },
});
