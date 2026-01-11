import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';
import tg from './tg.json';

// Get language from Telegram WebApp
const getTelegramLanguage = () => {
    try {
        const webapp = window.Telegram?.WebApp;
        const user = webapp?.initDataUnsafe?.user;
        return user?.language_code || 'ru';
    } catch {
        return 'ru';
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: ru },
            en: { translation: en },
            tg: { translation: tg },
        },
        lng: getTelegramLanguage(),
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
