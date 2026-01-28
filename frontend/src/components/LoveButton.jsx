import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import api from '../api/client';
import './LoveButton.css';

export default function LoveButton({ onLoveSent, disabled }) {
    const { t } = useTranslation();
    const { haptic } = useTelegram();
    const [pressed, setPressed] = useState(false);
    const [sending, setSending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [showHeart, setShowHeart] = useState(false);
    const isValentine = new Date().getUTCMonth() === 1 && new Date().getUTCDate() === 14;

    const handlePress = useCallback(async () => {
        if (disabled || sending || cooldown > 0) return;

        haptic('impact');
        setPressed(true);
        setSending(true);

        try {
            await api.sendLove();

            haptic('notification');
            setShowHeart(true);

            setTimeout(() => setShowHeart(false), 1500);

            if (onLoveSent) onLoveSent();
        } catch (error) {
            if (error.message === 'cooldown') {
                setCooldown(5);
                const interval = setInterval(() => {
                    setCooldown(c => {
                        if (c <= 1) {
                            clearInterval(interval);
                            return 0;
                        }
                        return c - 1;
                    });
                }, 1000);
            } else if (error.message === 'limit_reached') {
                window.Telegram?.WebApp?.showAlert(t('love.limit_reached_alert'));
            }
        } finally {
            setSending(false);
            setPressed(false);
        }
    }, [disabled, sending, cooldown, haptic, onLoveSent]);

    return (
        <div className="love-button-container">
            <motion.button
                className={`love-button ${pressed ? 'pressed' : ''} ${disabled ? 'disabled' : ''} ${isValentine ? 'festive' : ''}`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={handlePress}
                disabled={disabled || sending || cooldown > 0}
            >
                <motion.span
                    className="love-button-icon"
                    animate={pressed ? { scale: [1, 1.4, 1] } : isValentine ? { scale: [1, 1.1, 1] } : {}}
                    transition={isValentine ? { duration: 2, repeat: Infinity } : {}}
                >
                    {isValentine ? '💝' : '💕'}
                </motion.span>

                {cooldown > 0 ? (
                    <span className="love-button-text">{t('love.cooldown', { seconds: cooldown })}</span>
                ) : (
                    <span className="love-button-text">{t('home.send_love')}</span>
                )}
            </motion.button>

            {/* Floating hearts animation */}
            {showHeart && (
                <div className="floating-hearts">
                    {[...Array(isValentine ? 15 : 8)].map((_, i) => (
                        <motion.span
                            key={i}
                            className="floating-heart"
                            initial={{
                                opacity: 1,
                                y: 0,
                                x: (Math.random() - 0.5) * (isValentine ? 150 : 100),
                                scale: 0.5 + Math.random() * (isValentine ? 1 : 0.5),
                            }}
                            animate={{
                                opacity: 0,
                                y: -200,
                                rotate: (Math.random() - 0.5) * 60,
                            }}
                            transition={{
                                duration: 1.5,
                                delay: i * 0.1,
                                ease: 'easeOut',
                            }}
                        >
                            ❤️
                        </motion.span>
                    ))}
                </div>
            )}

            <p className="love-button-hint">{t('love.button_hint')}</p>
        </div>
    );
}
