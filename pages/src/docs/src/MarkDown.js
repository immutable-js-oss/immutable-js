/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import createClass from 'create-react-class';

const MarkDown = createClass({
  shouldComponentUpdate() {
    return false;
  },

  render() {
    const html = this.props.contents;
    return (
      <div
        className={this.props.className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
});

export default MarkDown;
