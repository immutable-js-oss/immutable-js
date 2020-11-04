/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { CallSigDef, MemberDef } from '../Defs';
import isMobile from '../isMobile';
import MarkDown from '../MarkDown';

export default class MemberDoc extends Component {
  static propTypes = {
    showDetail: PropTypes.bool.isRequired,
    member: PropTypes.object.isRequired,
    parentName: PropTypes.string.isRequired,
    typePropMap: PropTypes.object,
  }

  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      detail: props.showDetail,
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.showDetail && !this.props.showDetail) {
      this.setState({ detail: true });
    }
  }

  toggleDetail = (evt) => {
    console.log('bitchus');
    this.setState({ detail: !this.state.detail });
    evt.preventDefault();
  };

  render() {
    var typePropMap = this.props.typePropMap;
    var member = this.props.member;
    var module = member.isStatic ? this.props.parentName : null;
    var name = member.memberName;
    var def = member.memberDef;
    var doc = def.doc || {};
    var isProp = !def.signatures;

    var typeInfo = member.inherited && {
      propMap: typePropMap,
      defining: member.inherited.name,
    };

    var showDetail = isMobile ? this.state.detail : true;

    var memberAnchorLink = `/${this.props.parentName}/${name}`;

    return (
      <div className="interfaceMember" ref={(element) => { this._container = element; }}>
        <h3 className="memberLabel">
          <Link
            id={memberAnchorLink}
            to={memberAnchorLink}
            onClick={isMobile ? this.toggleDetail : null}
          >
            {(module ? module + '.' : '') + name + (isProp ? '' : '()')}
          </Link>
        </h3>
        <div>
          {showDetail && (
            <div key="detail" className="detail">
              {doc.synopsis && (
                <MarkDown className="synopsis" contents={doc.synopsis} />
              )}
              {isProp ? (
                <code className="codeBlock memberSignature">
                  <MemberDef
                    module={module}
                    member={{ name, type: def.type }}
                  />
                </code>
              ) : (
                <code className="codeBlock memberSignature">
                  {def.signatures.map((callSig, i) => [
                    <CallSigDef
                      key={i}
                      info={typeInfo}
                      module={module}
                      name={name}
                      callSig={callSig}
                    />,
                    '\n',
                  ])}
                </code>
              )}
              {member.inherited && (
                <section>
                  <h4 className="infoHeader">Inherited from</h4>
                  <code>
                    <Link to={'/' + member.inherited.name + '/' + name}>
                      {member.inherited.name + '#' + name}
                    </Link>
                  </code>
                </section>
              )}
              {member.overrides && (
                <section>
                  <h4 className="infoHeader">Overrides</h4>
                  <code>
                    <Link to={'/' + member.overrides.name + '/' + name}>
                      {member.overrides.name + '#' + name}
                    </Link>
                  </code>
                </section>
              )}
              {doc.notes &&
                doc.notes.map((note, i) => (
                  <section key={i}>
                    <h4 className="infoHeader">{note.name}</h4>
                    {note.name === 'alias' ? (
                      <code>
                        <CallSigDef name={note.body} />
                      </code>
                    ) : (
                      <MarkDown className="discussion" contents={note.body} />
                    )}
                  </section>
                ))}
              {doc.description && (
                <section>
                  <h4 className="infoHeader">
                    {doc.description.substr(0, 5) === '<code'
                      ? 'Example'
                      : 'Discussion'}
                  </h4>
                  <MarkDown className="discussion" contents={doc.description} />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
