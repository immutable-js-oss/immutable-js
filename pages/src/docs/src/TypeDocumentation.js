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
import MemberDoc from './components/MemberDoc';
import isMobile from './isMobile';
import SideBar from './SideBar';
import MarkDown from './MarkDown';
import DocOverview from './DocOverview';
import collectMemberGroups from '../../../lib/collectMemberGroups';
import TypeKind from '../../../lib/TypeKind';
import getGlobalData from './global';
import FunctionDoc from './components/FunctionDoc';
import TypeDoc from './components/TypeDoc';

class TypeDocumentation extends Component {
  static propTypes = {
    match: RouterPropTypes.match,
  }

  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      showInherited: true,
      showInGroups: true,
    }
  }

  determineDoc(match) {
    const rootDef = getGlobalData().Immutable;

    if (!match) {
      return {
        def: rootDef,
        name: undefined,
        memberName: undefined,
      };
    }

    const { name, memberName } = match.params;
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
    const { name, memberName, def } = this.determineDoc(this.props.match);
    const memberGroups = collectMemberGroups(def && def.interface, {
      showInGroups: this.state.showInGroups,
      showInherited: this.state.showInherited,
    });

    let docComponent;
    if (!def) {
      docComponent = (<NotFound />);
    } else if(!name) {
      docComponent = (<DocOverview def={def} />);
    } else if( !def.interface && !def.module) {
      docComponent = (<FunctionDoc name={name} def={def.call} />);
    } else {
      docComponent = (
        <TypeDoc
          name={name}
          def={def}
          memberName={memberName}
          memberGroups={memberGroups}
        />
      );
    }

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
          {docComponent}
        </div>
      </div>
    );
  }
}

function NotFound() {
  return <div>Not found</div>;
}

export default TypeDocumentation;
