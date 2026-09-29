import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Keeps the browser's own dialogs and controls out of the console.
 *
 * `window.confirm` on the Team page, `window.prompt` for declining a social
 * post and a native select on the phone-width stepper all slipped in one at a
 * time, each looking and behaving unlike the rest of the console and unable to
 * name the record or show progress. Every one now has a themed replacement
 * (ConfirmDialog, DeclinePublicationDialog, OptionSelect, DateField), and this
 * test fails as soon as a new one appears, naming the file and line.
 *
 * The source is read as syntax rather than searched as text, so comments that
 * explain what was replaced (as this one does) are not mistaken for uses.
 */
const sources = import.meta.glob<string>(
  ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'],
  { query: '?raw', import: 'default', eager: true },
);

const NATIVE_DIALOGS = new Set(['alert', 'confirm', 'prompt']);
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);
const NATIVE_TAGS = new Set(['select', 'option', 'datalist', 'dialog', 'NativeSelect']);
const NATIVE_INPUT_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color']);

type Check = (node: ts.Node) => string | null;

const nameOf = (name: ts.Node): string =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : '';

/** The string an attribute is set to, as `a="x"` or `a={'x'}`; null otherwise. */
const attributeText = (attribute: ts.JsxAttribute): string | null => {
  const value = attribute.initializer;
  if (!value) return null;
  if (ts.isStringLiteral(value)) return value.text;
  if (ts.isJsxExpression(value) && value.expression && ts.isStringLiteralLike(value.expression)) {
    return value.expression.text;
  }
  return null;
};

/** Whether an attribute is switched on: `a`, `a={true}`. */
const attributeIsOn = (attribute: ts.JsxAttribute): boolean => {
  const value = attribute.initializer;
  if (!value) return true;
  return ts.isJsxExpression(value) && value.expression?.kind === ts.SyntaxKind.TrueKeyword;
};

const attributes = (element: ts.JsxOpeningLikeElement): ts.JsxAttribute[] =>
  element.attributes.properties.filter(ts.isJsxAttribute);

const findAttribute = (
  element: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined =>
  attributes(element).find((attribute) => nameOf(attribute.name) === name);

/** `alert()`, `window.confirm()` and the like. */
const nativeDialogCall: Check = (node) => {
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  if (ts.isIdentifier(callee) && NATIVE_DIALOGS.has(callee.text)) return `${callee.text}()`;
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    GLOBAL_OBJECTS.has(callee.expression.text) &&
    NATIVE_DIALOGS.has(callee.name.text)
  ) {
    return `${callee.expression.text}.${callee.name.text}()`;
  }
  return null;
};

/** The browser's "Leave site?" prompt, by listener or by property. */
const leavePrompt: Check = (node) => {
  if (ts.isStringLiteralLike(node) && node.text === 'beforeunload') return 'beforeunload';
  if (ts.isIdentifier(node) && node.text === 'onbeforeunload') return 'onbeforeunload';
  return null;
};

/** `native: true` on a select's props. */
const nativeSelectProp: Check = (node) =>
  ts.isPropertyAssignment(node) &&
  nameOf(node.name) === 'native' &&
  node.initializer.kind === ts.SyntaxKind.TrueKeyword
    ? 'native: true'
    : null;

const nativeElement: Check = (node) => {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
  const tag = node.tagName.getText();
  if (NATIVE_TAGS.has(tag)) return `<${tag}>`;
  const native = findAttribute(node, 'native');
  if (native && attributeIsOn(native)) return `<${tag} native>`;
  const type = findAttribute(node, 'type');
  const inputType = type ? attributeText(type) : null;
  if (inputType && NATIVE_INPUT_TYPES.has(inputType)) return `type="${inputType}"`;
  return null;
};

/** A form the browser would validate with its own bubbles. */
const validatingForm: Check = (node) => {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
  const component = findAttribute(node, 'component');
  const isForm =
    node.tagName.getText() === 'form' || (component && attributeText(component) === 'form');
  if (!isForm) return null;
  const noValidate = findAttribute(node, 'noValidate');
  return noValidate && attributeIsOn(noValidate) ? null : 'form without noValidate';
};

const CHECKS: Check[] = [
  nativeDialogCall,
  leavePrompt,
  nativeSelectProp,
  nativeElement,
  validatingForm,
];

const findingsIn = (file: string, text: string): string[] => {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    for (const check of CHECKS) {
      const what = check(node);
      if (what) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        found.push(`${file.replace('../', 'src/')}:${line + 1} ${what}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

describe('the console uses no native browser dialogs or controls', () => {
  it('reads the source it guards', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
  });

  it('has no alert, confirm, prompt, leave-site prompt, native select or date input, and no browser validation', () => {
    const findings = Object.entries(sources).flatMap(([file, text]) => findingsIn(file, text));
    expect(findings).toEqual([]);
  });

  it('would catch each of them', () => {
    const sample = [
      "if (window.confirm('Delete?')) remove();",
      "const reason = prompt('Why?');",
      "addEventListener('beforeunload', guard);",
      'const props = { select: { native: true } };',
      'const a = <select><option>One</option></select>;',
      'const b = <input type="date" />;',
      'const c = <form onSubmit={submit}><button /></form>;',
      'const d = <Box component="form" onSubmit={submit} />;',
      'const e = <Box component="form" noValidate onSubmit={submit} />;',
    ].join('\n');
    const findings = findingsIn('../sample.tsx', sample).map((finding) =>
      finding.replace(/^src\/sample\.tsx:\d+ /, ''),
    );
    expect(findings).toEqual([
      'window.confirm()',
      'prompt()',
      'beforeunload',
      'native: true',
      '<select>',
      '<option>',
      'type="date"',
      'form without noValidate',
      'form without noValidate',
    ]);
  });
});
