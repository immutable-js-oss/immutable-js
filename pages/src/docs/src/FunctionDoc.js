import MarkDown from './MarkDown';
import { CallSigDef } from './Defs';
import React, { Component } from 'react';

class FunctionDoc extends Component {
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

export default FunctionDoc;
