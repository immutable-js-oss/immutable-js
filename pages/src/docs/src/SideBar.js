/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Map, Seq } from '../../../../';
import getGlobalData from './global';

class SideBar extends Component {
  static propTypes = {
    focus: PropTypes.string,
    memberGroups: PropTypes.object,
    toggleShowInherited: PropTypes.func.isRequired,
    toggleShowInGroups: PropTypes.func.isRequired,
    selectDocVersion: PropTypes.func.isRequired,
    showInGroups: PropTypes.bool.isRequired,
    showInherited: PropTypes.bool.isRequired,
  }

  render() {
    const type = getGlobalData().Immutable;
    const versions = window.versions || [];
    let defaultVersion = versions.find(v => v[1] === type.version);
    defaultVersion = defaultVersion ? defaultVersion[0] : type.version;

    return (
      <div className="sideBar">
        <div className="toolBar">
          <div className="versionSelector">
            Doc version&nbsp;
            <select onChange={this.props.selectDocVersion} defaultValue={defaultVersion}>
              {versions.map(([name, tag]) => (<option value={name} key={name}>{tag}</option>))}
            </select>
          </div>
          <div
            onClick={this.props.toggleShowInGroups}
            onKeyPress={this.props.toggleShowInGroups}
          >
            <span className={this.props.showInGroups ? 'selected' : ''}>
              Grouped
            </span>
            {' • '}
            <span className={this.props.showInGroups ? '' : 'selected'}>
              Alphabetized
            </span>
          </div>
          <div
            onClick={this.props.toggleShowInherited}
            onKeyPress={this.props.toggleShowInherited}
          >
            <span className={this.props.showInherited ? 'selected' : ''}>
              Inherited
            </span>
            {' • '}
            <span className={this.props.showInherited ? '' : 'selected'}>
              Defined
            </span>
          </div>
        </div>
        <div className="scrollContent">
          <h4 className="groupTitle">API</h4>
          {Seq(type.module)
            .flatMap((t, name) => flattenSubmodules(Map(), t, name))
            .map((t, name) => this.renderSideBarType(name, t))
            .valueSeq()
            .toArray()}
        </div>
      </div>
    );
  }

  renderSideBarType(typeName, type) {
    var isFocus = this.props.focus === typeName;
    var isFunction = !type.interface && !type.module;
    var call = type.call;
    var functions = Seq(type.module).filter(t => !t.interface && !t.module);

    var label = typeName + (isFunction ? '()' : '');

    if (!isFocus) {
      label = <NavLink exact to={'/' + typeName}>{label}</NavLink>;
    }

    var memberGroups = this.props.memberGroups;

    var members =
      !isFocus || isFunction ? null : (
        <div className="members">
          {call && (
            <section>
              <h4 className="groupTitle">Construction</h4>
              <div>
                <NavLink exact to={'/' + typeName + '/' + typeName}>
                  {typeName + '()'}
                </NavLink>
              </div>
            </section>
          )}

          {functions.count() > 0 && (
            <section>
              <h4 className="groupTitle">Static Methods</h4>
              {functions
                .map((t, name) => (
                  <div key={name}>
                    <NavLink exact to={'/' + typeName + '/' + name}>
                      {typeName + '.' + name + '()'}
                    </NavLink>
                  </div>
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
                          <div key={member.memberName}>
                            <NavLink exact to={'/' + typeName + '/' + member.memberName}>
                              {member.memberName +
                                ((member.memberDef && member.memberDef.signatures) ? '()' : '')}
                            </NavLink>
                          </div>
                        )),
                      ])
              )
              .flatten()
              .valueSeq()
              .toArray()}
          </section>
        </div>
      );

    return (
      <div key={typeName}>
        <h2>{label}</h2>
        {members}
      </div>
    );
  }
}

function flattenSubmodules(modules, type, name) {
  modules = modules.set(name, type);
  return type.module
    ? Seq(type.module)
        .filter(t => t.interface || t.module)
        .reduce(
          (modules, subT, subName) =>
            flattenSubmodules(modules, subT, name + '.' + subName),
          modules
        )
    : modules;
}

export default SideBar;
