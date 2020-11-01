/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Seq } from '../../../../';
import Markdown from './MarkDown';
import PropTypes from 'prop-types';

class DocOverview extends Component {
  static propTypes = {
    def: PropTypes.object.isRequired,
  }

  render() {
    var def = this.props.def;
    var doc = def.doc;
    console.log('delkf', def);

    return (
      <div>
        {doc && (
          <section>
            <Markdown contents={doc.synopsis} />
            {doc.description && <Markdown contents={doc.description} />}
          </section>
        )}

        <h4 className="groupTitle">API</h4>

        {Seq(def.module)
          .map((t, name) => {
            var isFunction = !t.interface && !t.module;
            if (isFunction) {
              t = t.call;
            }
            return (
              <section key={name} className="interfaceMember">
                <h3 className="memberLabel">
                  <Link to={'/' + name}>
                    {name + (isFunction ? '()' : '')}
                  </Link>
                </h3>
                {t.doc && (
                  <Markdown className="detail" contents={t.doc.synopsis} />
                )}
              </section>
            );
          })
          .valueSeq()
          .toArray()}
      </div>
    );
  }
}

export default DocOverview;
