/**
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { render } from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';

/*
window.data = {
  Immutable: window.Immutable
};
*/

import App from './index';

// We could use React's hydrate here. But the paths of StaticRouter match BrowserRouter, but not HashRouter, so we might end up with wrong links
render(
  <Router>
    <App />
  </Router>,
  document.querySelector('#app')
);
