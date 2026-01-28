import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ValentineCountdown.css';

const ValentineCountdown = () => {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        const targetDate = new Date('2026-02-14T00:00:00');

        const calculateTimeLeft = () => {
            const difference = targetDate - new Date();
            let timeLeftData = {};

            if (difference > 0) {
                timeLeftData = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            } else {
                timeLeftData = null;
            }
            return timeLeftData;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) return null;

    return (
        <div className="valentine-countdown">
            <div className="countdown-label">{t('home.valentine_countdown')}</div>
            <div className="countdown-timer">
                <div className="time-block">
                    <span>{timeLeft.days}</span>
                    <label>{t('valentine.days')}</label>
                </div>
                <div className="time-block">
                    <span>{timeLeft.hours}</span>
                    <label>{t('valentine.hours')}</label>
                </div>
                <div className="time-block">
                    <span>{timeLeft.minutes}</span>
                    <label>{t('valentine.minutes')}</label>
                </div>
                <div className="time-block">
                    <span>{timeLeft.seconds}</span>
                    <label>{t('valentine.seconds')}</label>
                </div>
            </div>
        </div>
    );
};

export default ValentineCountdown;
