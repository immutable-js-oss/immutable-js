/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import createClass from 'create-react-class';
import loadJSON from './loadJSON';

// API endpoints
// https://registry.npmjs.org/immutable/latest
// https://api.github.com/repos/facebook/immutable-js

var StarBtn = createClass({
  getInitialState: function() {
    return { stars: null };
  },

  componentDidMount: function() {
    loadJSON('https://api.github.com/repos/facebook/immutable-js', value => {
      value &&
        value.stargazers_count &&
        this.setState({ stars: value.stargazers_count });
    });
  },

  render: function() {
    return (
      <span className="github-btn">
        <a
          className="gh-btn"
          id="gh-btn"
          href="https://github.com/facebook/immutable-js/"
        >
          <span className="gh-ico" />
          <span className="gh-text">Star</span>
        </a>
        {this.state.stars && <span className="gh-triangle" />}
        {this.state.stars && (
          <a
            className="gh-count"
            href="https://github.com/facebook/immutable-js/stargazers"
          >
            {this.state.stars}
          </a>
        )}
      </span>
    );
  },
});

export default StarBtn;
