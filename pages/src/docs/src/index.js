/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import DocHeader from './DocHeader';
import DocSearch from './DocSearch.js';
import TypeDocumentation from './TypeDocumentation';

import '../../../lib/runkit-embed';

class App extends Component {
  /*
  componentWillMount() {
    var location;
    var scrollBehavior;

    if (typeof window !== "undefined" && window.document) {
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
   */

  render() {
    return (
      <div>
        <DocHeader />
        <div className="pageBody" id="body">
          <div className="contents">
            <DocSearch />
            <Switch>
              <Route exact path="/" component={TypeDocumentation} />
              <Route path="/:name/:memberName" component={TypeDocumentation} />
              <Route path="/:name" component={TypeDocumentation} />
            </Switch>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
