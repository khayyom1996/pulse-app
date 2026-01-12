import { useState, useEffect } from 'react';
import './AdminPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminPage() {
    const [adminKey, setAdminKey] = useState(localStorage.getItem('pulse_admin_key') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [stats, setStats] = useState(null);
    const [userChart, setUserChart] = useState([]);
    const [activityChart, setActivityChart] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Broadcast state
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [broadcastResult, setBroadcastResult] = useState(null);
    const [sending, setSending] = useState(false);

    const headers = { 'X-Admin-Key': adminKey };

    const authenticate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`, { headers });
            if (res.ok) {
                localStorage.setItem('pulse_admin_key', adminKey);
                setIsAuthenticated(true);
                loadDashboard();
            } else {
                setError('Неверный ключ администратора');
            }
        } catch (e) {
            setError('Ошибка подключения');
        }
        setLoading(false);
    };

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [statsRes, userChartRes, activityRes, topRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, { headers }),
                fetch(`${API_URL}/api/admin/chart/users?days=30`, { headers }),
                fetch(`${API_URL}/api/admin/chart/activity?days=14`, { headers }),
                fetch(`${API_URL}/api/admin/top-users`, { headers }),
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (userChartRes.ok) {
                const data = await userChartRes.json();
                setUserChart(data.data || []);
            }
            if (activityRes.ok) {
                const data = await activityRes.json();
                setActivityChart(data.data || []);
            }
            if (topRes.ok) {
                const data = await topRes.json();
                setTopUsers(data.topUsers || []);
            }
        } catch (e) {
            console.error('Dashboard load error:', e);
        }
        setLoading(false);
    };

    const sendBroadcast = async () => {
        if (!broadcastMessage.trim()) return;

        setSending(true);
        setBroadcastResult(null);

        try {
            const res = await fetch(`${API_URL}/api/admin/broadcast`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: broadcastMessage, targetGroup }),
            });

            const data = await res.json();
            if (res.ok) {
                setBroadcastResult(data.stats);
                setBroadcastMessage('');
            } else {
                setBroadcastResult({ error: data.error });
            }
        } catch (e) {
            setBroadcastResult({ error: 'Ошибка отправки' });
        }
        setSending(false);
    };

    useEffect(() => {
        if (adminKey && localStorage.getItem('pulse_admin_key') === adminKey) {
            authenticate();
        }
    }, []);

    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <div className="login-card">
                    <h1>🔐 Pulse Admin</h1>
                    <input
                        type="password"
                        placeholder="Admin Secret Key"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                    />
                    {error && <p className="error">{error}</p>}
                    <button onClick={authenticate} disabled={loading}>
                        {loading ? 'Проверка...' : 'Войти'}
                    </button>
                </div>
            </div>
        );
    }

    const maxUserCount = Math.max(...userChart.map(d => d.count), 1);
    const maxActivityCount = Math.max(...activityChart.map(d => d.loveClicks + d.swipes), 1);

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1>📊 Pulse Dashboard</h1>
                <button className="refresh-btn" onClick={loadDashboard} disabled={loading}>
                    🔄 {loading ? 'Загрузка...' : 'Обновить'}
                </button>
            </header>

            {stats && (
                <>
                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card users">
                            <div className="stat-icon">👥</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.users.total}</span>
                                <span className="stat-label">Пользователей</span>
                                <span className="stat-sub">+{stats.users.today} сегодня</span>
                            </div>
                        </div>
                        <div className="stat-card pairs">
                            <div className="stat-icon">💕</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.pairs.total}</span>
                                <span className="stat-label">Пар</span>
                                <span className="stat-sub">{stats.pairs.pending} ожидают</span>
                            </div>
                        </div>
                        <div className="stat-card activity">
                            <div className="stat-icon">❤️</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.activity.totalLoveClicks}</span>
                                <span className="stat-label">Кликов любви</span>
                                <span className="stat-sub">~{stats.activity.avgPerDay}/день</span>
                            </div>
                        </div>
                        <div className="stat-card engagement">
                            <div className="stat-icon">🌳</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.engagement.avgStreak}</span>
                                <span className="stat-label">Средний streak</span>
                                <span className="stat-sub">{stats.engagement.totalMatches} совпадений</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="charts-row">
                        {/* User Registration Chart */}
                        <div className="chart-card">
                            <h3>📈 Регистрации (30 дней)</h3>
                            <div className="chart-container">
                                <div className="bar-chart">
                                    {userChart.map((d, i) => (
                                        <div key={i} className="bar-wrapper">
                                            <div
                                                className="bar"
                                                style={{ height: `${(d.count / maxUserCount) * 100}%` }}
                                                title={`${d.date}: ${d.count}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-legend">
                                    <span>{userChart[0]?.date}</span>
                                    <span>{userChart[userChart.length - 1]?.date}</span>
                                </div>
                            </div>
                        </div>

                        {/* Activity Chart */}
                        <div className="chart-card">
                            <h3>💓 Активность (14 дней)</h3>
                            <div className="chart-container">
                                <div className="bar-chart stacked">
                                    {activityChart.map((d, i) => (
                                        <div key={i} className="bar-wrapper">
                                            <div
                                                className="bar love"
                                                style={{ height: `${(d.loveClicks / maxActivityCount) * 100}%` }}
                                                title={`Любовь: ${d.loveClicks}`}
                                            />
                                            <div
                                                className="bar swipe"
                                                style={{ height: `${(d.swipes / maxActivityCount) * 50}%` }}
                                                title={`Свайпы: ${d.swipes}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-labels">
                                    <span className="label-love">❤️ Любовь</span>
                                    <span className="label-swipe">💜 Свайпы</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Users and Broadcast */}
                    <div className="bottom-row">
                        {/* Top Users */}
                        <div className="panel top-users">
                            <h3>🏆 Топ активных</h3>
                            <div className="top-list">
                                {topUsers.map((u, i) => (
                                    <div key={i} className="top-item">
                                        <span className="rank">{i + 1}</span>
                                        <span className="name">{u.user}</span>
                                        <span className="count">{u.count} ❤️</span>
                                    </div>
                                ))}
                                {topUsers.length === 0 && (
                                    <p className="empty">Нет данных</p>
                                )}
                            </div>
                        </div>

                        {/* Broadcast */}
                        <div className="panel broadcast">
                            <h3>📢 Рассылка</h3>
                            <div className="broadcast-form">
                                <select
                                    value={targetGroup}
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                >
                                    <option value="all">Все пользователи</option>
                                    <option value="paired">Только в паре</option>
                                    <option value="unpaired">Без пары</option>
                                    <option value="active">Активные (7 дней)</option>
                                </select>
                                <textarea
                                    placeholder="Текст сообщения (поддерживает Markdown)"
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    rows={4}
                                />
                                <button
                                    onClick={sendBroadcast}
                                    disabled={sending || !broadcastMessage.trim()}
                                    className="send-btn"
                                >
                                    {sending ? '📤 Отправка...' : '📤 Отправить'}
                                </button>
                                {broadcastResult && (
                                    <div className={`broadcast-result ${broadcastResult.error ? 'error' : 'success'}`}>
                                        {broadcastResult.error
                                            ? `❌ ${broadcastResult.error}`
                                            : `✅ Отправлено: ${broadcastResult.sent}, Ошибок: ${broadcastResult.failed}`
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="quick-stat">
                            <span className="qs-value">{stats.users.week}</span>
                            <span className="qs-label">За неделю</span>
                        </div>
                        <div className="quick-stat">
                            <span className="qs-value">{stats.users.month}</span>
                            <span className="qs-label">За месяц</span>
                        </div>
                        <div className="quick-stat">
                            <span className="qs-value">{stats.engagement.totalDates}</span>
                            <span className="qs-label">Важных дат</span>
                        </div>
                        <div className="quick-stat">
                            <span className="qs-value">{stats.engagement.totalSwipes}</span>
                            <span className="qs-label">Всего свайпов</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
