export function greetingFor(name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? 'Hola' : `Hola, ${trimmed}`;
}
