import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import LoveButton from '../components/LoveButton';
import TreeStreak from '../components/TreeStreak';
import { useTelegram } from '../hooks/useTelegram';
import api from '../api/client';
import './HomePage.css';

export default function HomePage() {
    const { t } = useTranslation();
    const { user } = useTelegram();
    const [userData, setUserData] = useState(null);
    const [pair, setPair] = useState(null);
    const [partner, setPartner] = useState(null);
    const [streak, setStreak] = useState({ current: 0, max: 0, level: 1 });
    const [todayLoves, setTodayLoves] = useState(0);
    const [loading, setLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState('');
    const [showJoin, setShowJoin] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const initData = window.Telegram?.WebApp?.initData || '';
            const result = await api.login(initData);

            setUserData(result.user);
            setPair(result.pair);
            setPartner(result.partner);

            if (result.pair?.streak) {
                setStreak({
                    current: result.pair.streak.current,
                    max: result.pair.streak.max,
                    level: result.pair.streak.level,
                });
            }

            // Load today's stats
            if (result.pair?.isComplete) {
                const loveData = await api.getLoveHistory();
                setTodayLoves(loveData.stats?.today || 0);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePair = async () => {
        try {
            const result = await api.createPair();
            setPair(result.pair);
        } catch (error) {
            console.error('Failed to create pair:', error);
        }
    };

    const handleJoinPair = async () => {
        if (!inviteCode.trim()) return;

        try {
            await api.joinPair(inviteCode.trim());
            loadData(); // Reload to get updated pair info
            setShowJoin(false);
        } catch (error) {
            console.error('Failed to join pair:', error);
        }
    };

    const handleLoveSent = () => {
        setTodayLoves(prev => prev + 1);
        loadData(); // Refresh streak
    };

    const copyInviteLink = () => {
        const botUsername = 'pulse_love_bot'; // TODO: Get from config
        const link = `https://t.me/${botUsername}?start=invite_${pair.inviteCode}`;
        navigator.clipboard.writeText(link);
        window.Telegram?.WebApp?.showAlert(t('pair.link_copied'));
    };

    if (loading) {
        return (
            <div className="page loading-page">
                <div className="loader">💕</div>
                <p>{t('app.loading')}</p>
            </div>
        );
    }

    // Not paired state
    if (!pair || !pair.isComplete) {
        return (
            <div className="page">
                <motion.div
                    className="welcome-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>{t('home.welcome', { name: userData?.firstName || 'User' })}</h1>

                    {pair && !pair.isComplete ? (
                        // Has invite code, waiting for partner
                        <div className="invite-section">
                            <p>{t('pair.invite_title')}</p>
                            <div className="invite-code">{pair.inviteCode}</div>
                            <button className="btn btn-primary" onClick={copyInviteLink}>
                                {t('pair.copy_link')}
                            </button>
                        </div>
                    ) : (
                        // No pair yet
                        <div className="pair-actions">
                            <button className="btn btn-primary" onClick={handleCreatePair}>
                                {t('pair.invite_title')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                                {t('pair.join_title')}
                            </button>
                        </div>
                    )}

                    {showJoin && (
                        <div className="join-section">
                            <input
                                type="text"
                                placeholder={t('pair.enter_code')}
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                maxLength={8}
                            />
                            <button className="btn btn-primary" onClick={handleJoinPair}>
                                {t('pair.join')}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    // Paired state - main view
    return (
        <div className="page home-page">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="home-content"
            >
                {/* Header */}
                <div className="home-header">
                    <h1>{t('home.partnered_with', { partner: partner?.firstName || 'Partner' })}</h1>
                    <div className="today-stats">
                        <span className="today-count">{todayLoves}</span>
                        <span className="today-label">{t('home.today_loves')}</span>
                    </div>
                </div>

                {/* Love Button */}
                <LoveButton onLoveSent={handleLoveSent} disabled={!pair.isComplete} />

                {/* Tree Streak */}
                <TreeStreak
                    level={streak.level}
                    currentStreak={streak.current}
                    maxStreak={streak.max}
                />
            </motion.div>
        </div>
    );
}
