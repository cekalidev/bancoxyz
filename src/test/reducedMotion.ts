import { AccessibilityInfo } from 'react-native';

// Simula la preferencia del sistema de reducir el movimiento. Llamar antes de montar (p. ej. en el test).
export function mockReducedMotion(enabled: boolean) {
  return jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
}
