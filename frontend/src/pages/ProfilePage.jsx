import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import './ProfilePage.css';

const ProfilePage = () => {
    const { t, i18n } = useTranslation();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Get user info and stats
            const [userData, wishStats] = await Promise.all([
                apiClient.getPremiumStatus(), // Reusing this for basic info
                apiClient.getWishStats(),
            ]);
            // Since we don't have a separate getProfile yet, we assume the server returns some basic info with status
            setUser(userData);
            setStats(wishStats);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'ru' ? 'en' : 'ru';
        i18n.changeLanguage(nextLang);
    };

    if (loading) return <div className="page-loading">{t('app.loading')}</div>;

    return (
        <div className="profile-page page animate-fade-in">
            <header className="profile-header">
                <div className="profile-avatar">
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : '👤'}
                </div>
                <h1>{user?.firstName || 'User'}</h1>
                <div className={`premium-tag ${user?.isPremium ? 'active' : ''}`}>
                    {user?.isPremium ? 'Pulse Plus' : 'Pulse Free'}
                </div>
            </header>

            {!user?.isPremium && (
                <Link to="/premium" className="premium-promo-card">
                    <div className="promo-content">
                        <h3>Получить Pulse Plus ✨</h3>
                        <p>ИИ-психолог, эксклюзивные деревья и многое другое!</p>
                    </div>
                    <span className="promo-arrow">→</span>
                </Link>
            )}

            <div className="profile-section">
                <h2>{t('wishes.matches_title')}</h2>
                <div className="profile-stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{stats?.totalMatches || 0}</span>
                        <span className="stat-label">Совпадений</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats?.totalSwipes || 0}</span>
                        <span className="stat-label">Свайпов</span>
                    </div>
                </div>
            </div>

            <div className="profile-section">
                <h2>Настройки</h2>
                <div className="settings-list">
                    <div className="setting-item" onClick={toggleLanguage}>
                        <div className="setting-info">
                            <span className="setting-icon">🌐</span>
                            <span>Язык / Language</span>
                        </div>
                        <span className="setting-value">{i18n.language.toUpperCase()}</span>
                    </div>
                    <Link to="/premium" className="setting-item">
                        <div className="setting-info">
                            <span className="setting-icon">⭐️</span>
                            <span>Pulse Plus</span>
                        </div>
                        <span className="setting-value">{user?.isPremium ? 'Активен' : 'Купить'}</span>
                    </Link>
                </div>
            </div>

            <footer className="profile-footer">
                <p>Pulse v1.0.0</p>
                <p>Designed for couples 💕</p>
            </footer>
        </div>
    );
};

export default ProfilePage;
