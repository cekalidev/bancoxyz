import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { TextField } from '@/components/TextField';
import type { TextFieldProps } from '@/components/TextField';

const LABEL = 'Nombre del destinatario';
const LEFT = 'Ícono de búsqueda';
const PREFIX = 'US$';
const onChangeText = jest.fn();

function fieldProps(props: Partial<TextFieldProps> = {}): TextFieldProps {
  return { label: LABEL, value: '', onChangeText, ...props };
}

async function renderField(props: Partial<TextFieldProps> = {}) {
  await render(<TextField {...fieldProps(props)} />);
}

function getFieldBox() {
  const boxes = screen.container.queryAll(
    (node) => (StyleSheet.flatten(node.props.style)?.borderWidth ?? 0) > 0,
  );

  expect(boxes).toHaveLength(1);
  return boxes[0];
}

function indexOfNode(node: ReturnType<typeof getFieldBox>) {
  return screen.container.queryAll(() => true).indexOf(node);
}

describe('TextField contenido a la izquierda', () => {
  it('pinta lo que recibe en left dentro de la caja, antes del prefijo, y sin left el campo no cambia', async () => {
    await renderField({ left: <Text>{LEFT}</Text>, prefix: PREFIX });

    const left = within(getFieldBox()).getByText(LEFT);

    expect(getFieldBox().children).toHaveLength(3);
    expect(indexOfNode(left)).toBeLessThan(indexOfNode(screen.getByText(PREFIX)));
    expect(indexOfNode(left)).toBeLessThan(indexOfNode(screen.getByLabelText(LABEL)));

    await screen.rerender(<TextField {...fieldProps({ prefix: PREFIX })} />);

    const withoutLeft = JSON.stringify(screen.toJSON());

    expect(screen.queryByText(LEFT)).not.toBeOnTheScreen();
    expect(getFieldBox().children).toHaveLength(2);
    expect(indexOfNode(screen.getByText(PREFIX))).toBeLessThan(indexOfNode(screen.getByLabelText(LABEL)));

    await screen.rerender(<TextField {...fieldProps({ prefix: PREFIX, left: null })} />);

    expect(JSON.stringify(screen.toJSON())).toBe(withoutLeft);
  });
});
