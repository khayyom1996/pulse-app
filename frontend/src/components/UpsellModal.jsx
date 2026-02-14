import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './UpsellModal.css';

export default function UpsellModal({ isOpen, onClose, type = 'default' }) {
    const { t } = useTranslation();

    const content = {
        love: {
            icon: '❤️',
            desc: t('premium.upsell.love_desc', "You've already sent love today. Want unlimited love?"),
        },
        dates: {
            icon: '📅',
            desc: t('premium.upsell.dates_desc', "You've reached the limit of 3 dates. Unlock unlimited dates with Pulse Plus!"),
        },
        wishes: {
            icon: '✨',
            desc: t('premium.upsell.wishes_desc', "You've reached the limit of 3 wishes. Get unlimited wishes with Pulse Plus!"),
        },
        default: {
            icon: '💎',
            desc: t('premium.subtitle'),
        }
    };

    const current = content[type] || content.default;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="upsell-modal-overlay" onClick={onClose}>
                    <motion.div
                        className="upsell-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button className="upsell-close" onClick={onClose}>✕</button>

                        <div className="upsell-icon-wrapper">
                            <span className="upsell-icon">{current.icon}</span>
                        </div>

                        <h2 className="upsell-title">{t('premium.upsell.title', 'Limit Reached')}</h2>
                        <p className="upsell-desc">{current.desc}</p>

                        <div className="upsell-actions">
                            <Link to="/premium" className="btn btn-primary btn-block">
                                {t('premium.upsell.btn', 'Get Pulse Plus')}
                            </Link>
                            <button className="btn btn-text" onClick={onClose}>
                                {t('onboarding.skip', 'Maybe later')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
