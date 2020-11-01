/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import RouterPropTypes from 'react-router-prop-types';
import { Seq } from '../../../../';
import { InterfaceDef, CallSigDef } from './Defs';
import MemberDoc from './MemberDoc';
import isMobile from './isMobile';
import SideBar from './SideBar';
import MarkDown from './MarkDown';
import DocOverview from './DocOverview';
import collectMemberGroups from '../../../lib/collectMemberGroups';
import TypeKind from '../../../lib/TypeKind';
import getGlobalData from './global';

const typeDefURL =
  'https://github.com/immutable-js-oss/immutable-js/blob/master/type-definitions/Immutable.d.ts';
const issuesURL = 'https://github.com/immutable-js-oss/immutable-js/issues';

var Disclaimer = function() {
  return (
    <section className="disclaimer">
      This documentation is generated from{' '}
      <a href={typeDefURL}>Immutable.d.ts</a>. Pull requests and{' '}
      <a href={issuesURL}>Issues</a> welcome.
    </section>
  );
};

class TypeDocumentation extends Component {
  static propTypes = {
    match: RouterPropTypes.match.isRequired,
  }

  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      showInherited: true,
      showInGroups: true,
    }
  }

  determineDoc() {
    const rootDef = getGlobalData().Immutable;

    if (!this.props.match) {
      return {
        def: rootDef,
        name: undefined,
        memberName: undefined,
      };
    }

    const { name, memberName } = this.props.match.params;
    const namePath = name ? name.split('.') : [];
    console.log('roots!', rootDef);
    const def = namePath.reduce(
      (def, subName) => def && def.module && def.module[subName],
      rootDef
    );

    return { def, name, memberName };
  }

  toggleShowInGroups() {
    this.setState({ showInGroups: !this.state.showInGroups });
  }

  toggleShowInherited() {
    this.setState({ showInherited: !this.state.showInherited });
  }

  render() {
    const { name, memberName, def } = this.determineDoc();
    console.log('well uh!', def);

    const memberGroups = collectMemberGroups(def && def.interface, {
      showInGroups: this.state.showInGroups,
      showInherited: this.state.showInherited,
    });

    return (
      <div>
        {isMobile || (
          <SideBar
            focus={name}
            memberGroups={memberGroups}
            toggleShowInherited={this.toggleShowInherited}
            toggleShowInGroups={this.toggleShowInGroups}
            showInGroups={this.state.showInGroups}
            showInherited={this.state.showInherited}
          />
        )}
        <div key={name} className="docContents">
          {!def ? (
            <NotFound />
          ) : !name ? (
            <DocOverview def={def} />
          ) : !def.interface && !def.module ? (
            <FunctionDoc name={name} def={def.call} />
          ) : (
            <TypeDoc
              name={name}
              def={def}
              memberName={memberName}
              memberGroups={memberGroups}
            />
          )}
        </div>
      </div>
    );
  }
}

function NotFound() {
  return <div>Not found</div>;
}

class FunctionDoc extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    def: PropTypes.object.isRequired,
  }

  render() {
    var name = this.props.name;
    var def = this.props.def;
    var doc = def.doc || {};

    return (
      <div>
        <h1 className="typeHeader">{name + '()'}</h1>
        {doc.synopsis && (
          <MarkDown className="synopsis" contents={doc.synopsis} />
        )}
        <code className="codeBlock memberSignature">
          {def.signatures.map((callSig, i) => [
            <CallSigDef key={i} name={name} callSig={callSig} />,
            '\n',
          ])}
        </code>
        {doc.notes &&
          doc.notes.map((note, i) => (
            <section key={i}>
              <h4 className="infoHeader">{note.name}</h4>
              {note.name === 'alias' ? (
                <CallSigDef name={note.body} />
              ) : (
                note.body
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
        <Disclaimer />
      </div>
    );
  }
}

class TypeDoc extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    def: PropTypes.object.isRequired,
    memberName: PropTypes.string.isRequired,
    memberGroups: PropTypes.array.isRequired,
  }

  render() {
    var name = this.props.name;
    var def = this.props.def;
    var memberName = this.props.memberName;
    var memberGroups = this.props.memberGroups;

    var doc = def.doc || {};
    var call = def.call;
    var functions = Seq(def.module).filter(t => !t.interface && !t.module);
    var types = Seq(def.module).filter(t => t.interface || t.module);
    var interfaceDef = def.interface;
    var typePropMap = getTypePropMap(interfaceDef);

    return (
      <div>
        <h1 className="typeHeader">{name}</h1>
        {doc.synopsis && (
          <MarkDown className="synopsis" contents={doc.synopsis} />
        )}
        {interfaceDef && (
          <code className="codeBlock memberSignature">
            <InterfaceDef name={name} def={interfaceDef} />
          </code>
        )}

        {doc.notes &&
          doc.notes.map((note, i) => (
            <section key={i}>
              <h4 className="infoHeader">{note.name}</h4>
              {note.name === 'alias' ? (
                <CallSigDef name={note.body} />
              ) : (
                note.body
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

        {types.count() > 0 && (
          <section>
            <h4 className="groupTitle">Sub-types</h4>
            {types
              .map((t, typeName) => (
                <div key={typeName}>
                  <Link
                    to={'/' + (name ? name + '.' + typeName : typeName)}
                  >
                    {name ? name + '.' + typeName : typeName}
                  </Link>
                </div>
              ))
              .valueSeq()
              .toArray()}
          </section>
        )}

        {call && (
          <section>
            <h4 className="groupTitle">Construction</h4>
            <MemberDoc
              showDetail={name === memberName}
              parentName={name}
              member={{
                memberName: name,
                memberDef: call,
              }}
            />
          </section>
        )}

        {functions.count() > 0 && (
          <section>
            <h4 className="groupTitle">Static methods</h4>
            {functions
              .map((t, fnName) => (
                <MemberDoc
                  key={fnName}
                  showDetail={fnName === memberName}
                  parentName={name}
                  member={{
                    memberName: fnName,
                    memberDef: t.call,
                    isStatic: true,
                  }}
                />
              ))
              .valueSeq()
              .toArray()}
          </section>
        )}

        <section>
          {Seq(memberGroups)
            .map(
              (members, title) =>
                members.length === 0
                  ? null
                  : Seq([
                      <h4 key={title || 'Members'} className="groupTitle">
                        {title || 'Members'}
                      </h4>,
                      Seq(members).map(member => (
                        <MemberDoc
                          typePropMap={typePropMap}
                          key={member.memberName}
                          showDetail={member.memberName === memberName}
                          parentName={name}
                          member={member}
                        />
                      )),
                    ])
            )
            .flatten()
            .valueSeq()
            .toArray()}
        </section>

        <Disclaimer />
      </div>
    );
  }
}

/**
 * Get a map from super type parameter to concrete type definition. This is
 * used when rendering inherited type definitions to ensure contextually
 * relevant information.
 *
 * Example:
 *
 *   type A<T> implements B<number, T>
 *   type B<K, V> implements C<K, V, V>
 *   type C<X, Y, Z>
 *
 * parse C:
 *   {}
 *
 * parse B:
 *   { C<X: K
 *     C<Y: V
 *     C<Z: V }
 *
 * parse A:
 *   { B<K: number
 *     B<V: T
 *     C<X: number
 *     C<Y: T
 *     C<Z: T }
 */
function getTypePropMap(def) {
  const map = {};
  if (!def || !def.extends) {
    return map;
  }

  def.extends.forEach(e => {
    let superModule = getGlobalData().Immutable;
    e.name.split('.').forEach(part => {
      superModule =
        superModule && superModule.module && superModule.module[part];
    });
    var superInterface = superModule && superModule.interface;
    if (superInterface) {
      var interfaceMap = Seq(superInterface.typeParams)
        .toKeyedSeq()
        .flip()
        .map(i => e.args[i])
        .toObject();
      Seq(interfaceMap).forEach((v, k) => {
        map[e.name + '<' + k] = v;
      });
      var superMap = getTypePropMap(superInterface);
      Seq(superMap).forEach((v, k) => {
        map[k] = v.k === TypeKind.Param ? interfaceMap[v.param] : v;
      });
    }
  });
  return map;
}

export default TypeDocumentation;
