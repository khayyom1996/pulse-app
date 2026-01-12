import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';

// Get language from Telegram WebApp
const getTelegramLanguage = () => {
    try {
        const webapp = window.Telegram?.WebApp;
        const user = webapp?.initDataUnsafe?.user;
        const lang = user?.language_code || 'ru';
        // Only support ru and en
        return lang === 'en' ? 'en' : 'ru';
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
        },
        lng: getTelegramLanguage(),
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;

