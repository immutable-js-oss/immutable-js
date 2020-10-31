/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import createClass from 'create-react-class';

import SVGSet from '../../src/SVGSet';
import Logo from '../../src/Logo';
const defs = global.data; // injected by gulp

const DocHeader = createClass({
  render() {
    return (
      <div className="header">
        <div className="miniHeader">
          <div className="miniHeaderContents">
            <a href="../" target="_self" className="miniLogo">
              <SVGSet>
                <Logo color="#FC4349" />
                <Logo color="#2C3E50" inline />
              </SVGSet>
            </a>
            <a href="./" target="_self">
              Docs (v
              {defs.Immutable.version})
            </a>
            <a href="https://stackoverflow.com/questions/tagged/immutable.js?sort=votes">
              Questions
            </a>
            <a href="https://github.com/immutable-js-oss/immutable-js">
              Github
            </a>
          </div>
        </div>
      </div>
    );
  },
});

export default DocHeader;
