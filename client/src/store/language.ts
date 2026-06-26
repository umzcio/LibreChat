import { atom } from 'recoil';
import Cookies from 'js-cookie';
import { createStorageAtom } from './jotai-utils';

const readStoredLang = () => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const storedLang = localStorage.getItem('lang');
  if (!storedLang) {
    return undefined;
  }

  try {
    const parsedLang = JSON.parse(storedLang);
    return typeof parsedLang === 'string' ? parsedLang : storedLang;
  } catch {
    return storedLang;
  }
};

const defaultLang = () => {
  const userLang =
    (typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : null) ??
    'en';
  return Cookies.get('lang') || readStoredLang() || userLang;
};

const lang = createStorageAtom('lang', defaultLang());
lang.debugLabel = 'lang';
const languageLoading = atom<boolean>({
  key: 'languageLoading',
  default: false,
});

export default { lang, languageLoading };
