import { Cabin_400Regular, Cabin_500Medium, Cabin_700Bold } from '@expo-google-fonts/cabin';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

const APP_FONTS = {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Cabin_400Regular,
  Cabin_500Medium,
  Cabin_700Bold,
};

export function useAppFonts(): [boolean, Error | null] {
  return useFonts(APP_FONTS);
}
