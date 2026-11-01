import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';

import { IosDatePickerModal } from '@/components/IosDatePickerModal';
import { IosDatePickerPanel } from '@/components/IosDatePickerPanel';
import { calendarDateFromLocal, toLocalDate } from '@/utils/date';
import type { CalendarDate } from '@/utils/date';

export type DatePickerRequest = {
  value: CalendarDate;
  min?: CalendarDate;
  max?: CalendarDate;
  onPick: (date: CalendarDate) => void;
  onClose: () => void;
};

export type DatePicker = {
  open: (request: DatePickerRequest) => void;
  element: ReactElement | null;
};

function openAndroidPicker({ value, min, max, onPick, onClose }: DatePickerRequest) {
  DateTimePickerAndroid.open({
    mode: 'date',
    value: toLocalDate(value),
    ...(min && { minimumDate: toLocalDate(min) }),
    ...(max && { maximumDate: toLocalDate(max) }),
    onValueChange: (_event, date) => onPick(calendarDateFromLocal(date)),
    onDismiss: onClose,
  });
}

export type DatePickerOptions = { inline?: boolean };

function iosPickerFor(request: DatePickerRequest, close: () => void, inline: boolean): ReactElement {
  return createElement(inline ? IosDatePickerPanel : IosDatePickerModal, {
    value: request.value,
    min: request.min,
    max: request.max,
    onAccept: (date) => {
      close();
      request.onPick(date);
    },
    onCancel: () => {
      close();
      request.onClose();
    },
  });
}

export function useDatePicker(options?: DatePickerOptions): DatePicker {
  const [request, setRequest] = useState<DatePickerRequest | null>(null);
  const open = useCallback((next: DatePickerRequest) => {
    if (Platform.OS === 'android') openAndroidPicker(next);
    else setRequest(next);
  }, []);
  const close = useCallback(() => setRequest(null), []);

  const inline = options?.inline ?? false;

  return { open, element: request ? iosPickerFor(request, close, inline) : null };
}
