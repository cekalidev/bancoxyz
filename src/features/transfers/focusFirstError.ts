import type { RefObject } from 'react';
import { AccessibilityInfo, type PressableInstance, type TextInputInstance } from 'react-native';

import type { TransferErrors } from './types';

export type TransferFieldRefs = {
  amountRef: RefObject<TextInputInstance | null>;
  documentRef: RefObject<TextInputInstance | null>;
  dateRef: RefObject<PressableInstance | null>;
};

// Mueve el foco al primer campo con error, en el orden valor → documento → fecha.
export function focusFirstError(errors: TransferErrors, refs: TransferFieldRefs): void {
  if (errors.amount) refs.amountRef.current?.focus();
  else if (errors.document) refs.documentRef.current?.focus();
  else if (errors.date && refs.dateRef.current)
    AccessibilityInfo.sendAccessibilityEvent(refs.dateRef.current, 'focus');
}
