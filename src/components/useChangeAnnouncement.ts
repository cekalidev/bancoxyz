import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Anuncia `text` solo cuando cambia respecto al render anterior, nunca al montar.
// En Android basta la región viva del llamador (`accessibilityLiveRegion="polite"`),
// que no anuncia el contenido inicial; en iOS hay que anunciar a mano.
export function useChangeAnnouncement(text: string) {
  const previous = useRef(text);

  useEffect(() => {
    if (previous.current === text) return;
    previous.current = text;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
}
