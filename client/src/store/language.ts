import Cookies from 'js-cookie';
import { createStorageAtom } from './jotai-utils';

const defaultLang = () => {
  const userLang = navigator.language || navigator.languages[0];
  return Cookies.get('lang') || localStorage.getItem('lang') || userLang;
};

const lang = createStorageAtom('lang', defaultLang());
lang.debugLabel = 'lang';

export default { lang };
