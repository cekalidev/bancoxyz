import {
  isHiddenFromAccessibility,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { useState } from 'react';
import { processColor, StyleSheet } from 'react-native';

import { SearchIcon } from '@/components/icons/SearchIcon';
import { strokeColorsOf } from '@/test/iconPaths';
import { colors, spacing } from '@/theme';

import { SearchField } from './SearchField';
import type { SearchFieldProps } from './SearchField';

const LABEL = 'Nombre del destinatario';
const PLACEHOLDER = 'Buscar por nombre';
const CLEAR_LABEL = 'Borrar búsqueda';
const HIDDEN = { includeHiddenElements: true };
const LONG_TEXT = 'x'.repeat(100);
const NON_EMPTY_QUERIES = ['a', ' ', '   ', 'Messi', '  messi  ', LONG_TEXT];

type Node = ReturnType<typeof getFieldBox>;

function fieldProps(props: Partial<SearchFieldProps> = {}): SearchFieldProps {
  return { query: '', onChangeText: jest.fn(), onClear: jest.fn(), ...props };
}

function Harness() {
  const [query, setQuery] = useState('');

  return <SearchField query={query} onChangeText={setQuery} onClear={() => setQuery('')} />;
}

function getInput() {
  return screen.getByLabelText(LABEL);
}

function getFieldBox() {
  const boxes = screen.container.queryAll(
    (node) => (StyleSheet.flatten(node.props.style)?.borderWidth ?? 0) > 0,
  );

  expect(boxes).toHaveLength(1);
  return boxes[0];
}

function pathNodesOf(node: Node) {
  return node.queryAll((child) => typeof child.props.d === 'string');
}

async function searchIconPaths() {
  const { root, unmount } = await render(<SearchIcon color={colors.textSecondary} />);
  const paths = root ? pathNodesOf(root).map((node) => node.props.d) : [];

  await unmount();
  return paths;
}

function indexOfNode(node: Node) {
  return screen.container.queryAll(() => true).indexOf(node);
}

function marginsAround(node: Node, box: Node) {
  const margins = [];

  for (let current = node.parent; current && current !== box; current = current.parent) {
    margins.push(StyleSheet.flatten(current.props.style)?.marginRight);
  }

  return margins;
}

function expectDecorativeLensBeforeInput(iconPaths: string[]) {
  const box = getFieldBox();
  const lensPaths = pathNodesOf(box);

  expect(iconPaths).not.toHaveLength(0);
  expect(lensPaths.map((node) => node.props.d)).toEqual(iconPaths);
  expect(strokeColorsOf(box)).toContain(processColor(colors.textSecondary));
  expect(lensPaths.map((node) => isHiddenFromAccessibility(node))).toEqual(iconPaths.map(() => true));
  expect(indexOfNode(lensPaths[0])).toBeLessThan(indexOfNode(getInput()));
  expect(marginsAround(lensPaths[0], box)).toContain(spacing.xs);
}

describe('SearchField', () => {
  it('muestra la etiqueta visible, la lupa decorativa y el placeholder, sin tope de longitud', async () => {
    const iconPaths = await searchIconPaths();
    const user = userEvent.setup();

    await render(<Harness />);

    expect(screen.getByText(LABEL, HIDDEN)).toBeOnTheScreen();
    expect(getInput()).toHaveProp('placeholder', PLACEHOLDER);
    expect(getInput()).not.toHaveProp('maxLength');
    expectDecorativeLensBeforeInput(iconPaths);

    await user.type(getInput(), LONG_TEXT, { skipBlur: true });

    expect(getInput()).toHaveDisplayValue(LONG_TEXT);
  });

  it('Borrar búsqueda aparece con cualquier carácter, también con solo espacios, y avisa con onClear', async () => {
    const props = fieldProps();
    const user = userEvent.setup();

    await render(<SearchField {...props} />);

    expect(screen.queryByRole('button', { name: CLEAR_LABEL })).not.toBeOnTheScreen();

    for (const [index, query] of NON_EMPTY_QUERIES.entries()) {
      await screen.rerender(<SearchField {...props} query={query} />);
      await user.press(screen.getByRole('button', { name: CLEAR_LABEL }));

      expect(props.onClear).toHaveBeenCalledTimes(index + 1);
    }

    expect(props.onChangeText).not.toHaveBeenCalled();

    await screen.rerender(<SearchField {...props} query="" />);

    expect(screen.queryByRole('button', { name: CLEAR_LABEL })).not.toBeOnTheScreen();
  });
});
