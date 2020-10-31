/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import createClass from 'create-react-class';

var SVGSet = createClass({
  render: function() {
    return (
      <svg className="svg" style={this.props.style} viewBox="0 0 300 42.2">
        {this.props.children}
      </svg>
    );
  },
});

export default SVGSet;
