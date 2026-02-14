import { useState, useEffect } from 'react';
import './AdminPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminPage() {
    const [adminKey, setAdminKey] = useState(localStorage.getItem('pulse_admin_key') || '');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [userChart, setUserChart] = useState([]);
    const [activityChart, setActivityChart] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [promoCodes, setPromoCodes] = useState([]);
    const [newPromo, setNewPromo] = useState({ code: '', type: 'premium', value: 30, usageLimit: '' });

    // App Settings state
    const [appSettings, setAppSettings] = useState({
        ai_enabled: 'false',
        ai_daily_limit: '3',
        pricing_monthly: '299',
        pricing_6month: '999',
        pricing_yearly: '1499',
        pricing_discount: '0',
        free_dates_limit: '3',
        free_wishes_limit: '3',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    // Broadcast state
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [broadcastResult, setBroadcastResult] = useState(null);
    const [sending, setSending] = useState(false);

    // New Features State
    const [pairs, setPairs] = useState([]);
    const [payments, setPayments] = useState([]);
    const [broadcastTestId, setBroadcastTestId] = useState('');
    const [broadcastLink, setBroadcastLink] = useState({ text: '', url: '' });

    const headers = { 'X-Admin-Key': adminKey };

    const loadSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAppSettings(data);
            }
        } catch (e) {
            console.error('Load settings error:', e);
        }
    };

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

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, { headers });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch (e) {
            console.error('Users load error:', e);
        }
        setLoading(false);
    };

    const loadPairs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/pairs`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPairs(data.pairs || []);
            }
        } catch (e) {
            console.error('Pairs load error:', e);
        }
        setLoading(false);
    };

    const loadPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/payments`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
            }
        } catch (e) {
            console.error('Payments load error:', e);
        }
        setLoading(false);
    };

    const deletePayment = async (id) => {
        if (!window.confirm('Delete payment?')) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/payments/${id}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                loadPayments();
            }
        } catch (e) {
            console.error('Delete payment error:', e);
        }
    };

    const sendBroadcast = async () => {
        if (!broadcastMessage.trim()) return;

        setSending(true);
        setBroadcastResult(null);

        try {
            const body = {
                message: broadcastMessage,
                targetGroup,
                testUserId: broadcastTestId,
                linkData: broadcastLink.text && broadcastLink.url ? broadcastLink : null
            };

            const res = await fetch(`${API_URL}/api/admin/broadcast`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
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

    const clearAllData = async () => {
        if (!window.confirm('⚠️ ВНИМАНИЕ! Вы уверены что хотите удалить ВСЕ данные?')) return;
        if (!window.confirm('Это действие необратимо. Подтвердите ещё раз.')) return;

        try {
            const res = await fetch(`${API_URL}/api/admin/clear-data`, {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: 'DELETE_ALL_DATA' }),
            });
            const data = await res.json();
            if (res.ok) {
                alert('✅ Все данные удалены');
                loadDashboard();
            } else {
                alert('❌ Ошибка: ' + data.error);
            }
        } catch (e) {
            alert('❌ Ошибка удаления');
        }
    };

    const loadPromoCodes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/promo-codes`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPromoCodes(data.promoCodes || []);
            }
        } catch (e) {
            console.error('Promo codes load error:', e);
        }
        setLoading(false);
    };

    const createPromoCode = async () => {
        if (!newPromo.code || !newPromo.value) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/promo-codes`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(newPromo),
            });
            if (res.ok) {
                setNewPromo({ code: '', type: 'premium', value: 30, usageLimit: '' });
                loadPromoCodes();
            }
        } catch (e) {
            console.error('Create promo error:', e);
        }
    };

    const deletePromoCode = async (id) => {
        if (!window.confirm('Удалить промокод?')) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/promo-codes/${id}`, {
                method: 'DELETE',
                headers,
            });
            if (res.ok) loadPromoCodes();
        } catch (e) {
            console.error('Delete promo error:', e);
        }
    };

    useEffect(() => {
        if (adminKey && localStorage.getItem('pulse_admin_key') === adminKey) {
            authenticate();
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && activeTab === 'users') {
            loadUsers();
        }
        if (isAuthenticated && activeTab === 'pairs') {
            loadPairs();
        }
        if (isAuthenticated && activeTab === 'payments') {
            loadPayments();
        }
        if (isAuthenticated && activeTab === 'promo') {
            loadPromoCodes();
        }
    }, [activeTab, isAuthenticated]);

    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'users', icon: '👥', label: 'Пользователи' },
        { id: 'pairs', icon: '💕', label: 'Пары' },
        { id: 'payments', icon: '💸', label: 'Платежи' },
        { id: 'promo', icon: '🎟️', label: 'Промокоды' },
        { id: 'broadcast', icon: '📢', label: 'Рассылка' },
        { id: 'settings', icon: '⚙️', label: 'Настройки' },
    ];

    const maxUserCount = Math.max(...(userChart || []).map(d => d.count), 1);
    const maxActivityCount = Math.max(...(activityChart || []).map(d => d.loveClicks), 1);

    return (
        <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <span className="logo">💕</span>
                    <span className="logo-text">Pulse Admin</span>
                </div>
                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (item.id === 'settings') loadSettings();
                            }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={() => {
                        localStorage.removeItem('pulse_admin_key');
                        setIsAuthenticated(false);
                    }}>
                        🚪 Выход
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        ☰
                    </button>
                    <h1>{menuItems.find(m => m.id === activeTab)?.label}</h1>
                    <button className="refresh-btn" onClick={loadDashboard} disabled={loading}>
                        🔄 {loading ? '...' : ''}
                    </button>
                </header>

                <div className="admin-content">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && stats && (
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
                                <div className="stat-card">
                                    <div className="stat-icon">🤖</div>
                                    <div className="stat-info">
                                        <span className="stat-value">{stats.activity.aiMessages || 0}</span>
                                        <span className="stat-label">Сообщений AI</span>
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
                                    </div>
                                </div>

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
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Users */}
                            <div className="panel">
                                <h3>🏆 Топ активных пользователей</h3>
                                <div className="top-list">
                                    {topUsers.map((u, i) => (
                                        <div key={i} className="top-item">
                                            <span className="rank">{i + 1}</span>
                                            <span className="name">{u.user}</span>
                                            <span className="count">{u.count} ❤️</span>
                                        </div>
                                    ))}
                                    {topUsers.length === 0 && <p className="empty">Нет данных</p>}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="panel users-panel">
                            <h3>👥 Все пользователи ({users.length})</h3>
                            <div className="users-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Telegram ID</th>
                                            <th>Chat ID</th>
                                            <th>Имя</th>
                                            <th>Username</th>
                                            <th>Язык</th>
                                            <th>Страна</th>
                                            <th>Дата</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.id}</td>
                                                <td>{user.telegramId || user.id}</td>
                                                <td>{user.chatId || '-'}</td>
                                                <td>{user.firstName} {user.lastName}</td>
                                                <td>@{user.username || '-'}</td>
                                                <td>{user.languageCode}</td>
                                                <td>{user.country || '-'}</td>
                                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pairs Tab */}
                    {activeTab === 'pairs' && (
                        <div className="panel users-panel">
                            <h3>💕 Пары ({pairs.length})</h3>
                            <div className="users-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Пользователь 1</th>
                                            <th>Пользователь 2</th>
                                            <th>Pulse Plus</th>
                                            <th>Дата создания</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pairs.map(p => (
                                            <tr key={p.id}>
                                                <td>{p.id}</td>
                                                <td>{p.user1 ? `${p.user1.firstName} ${p.user1.lastName || ''}` : p.user1Id}</td>
                                                <td>{p.user2 ? `${p.user2.firstName} ${p.user2.lastName || ''}` : (p.user2Id || '-')}</td>
                                                <td>
                                                    {p.hasPremium ? (
                                                        <span className="premium-badge">✨ ACTIVE</span>
                                                    ) : (
                                                        <span className="status-inactive">-</span>
                                                    )}
                                                </td>
                                                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div className="panel users-panel">
                            <h3>💸 Платежи ({payments.length})</h3>
                            <div className="users-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Пользователь</th>
                                            <th>Сумма</th>
                                            <th>Валюта</th>
                                            <th>Статус</th>
                                            <th>Дата</th>
                                            <th>Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(p => (
                                            <tr key={p.id}>
                                                <td>{p.id}</td>
                                                <td>{p.User ? `${p.User.firstName} (@${p.User.username})` : p.userId}</td>
                                                <td>{p.amount}</td>
                                                <td>{p.currency}</td>
                                                <td>
                                                    <span className={`status-badge status-${p.status}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(p.createdAt).toLocaleString()}</td>
                                                <td>
                                                    {p.status === 'pending' && (
                                                        <button
                                                            className="delete-btn-cell"
                                                            onClick={() => deletePayment(p.id)}
                                                            title="Удалить"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Broadcast Tab */}
                    {activeTab === 'broadcast' && (
                        <div className="panel broadcast-panel">
                            <h3>📢 Рассылка сообщений</h3>
                            <div className="broadcast-form">
                                <div className="form-group">
                                    <label>Целевая аудитория</label>
                                    <select
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value)}
                                    >
                                        <option value="all">Все пользователи</option>
                                        <option value="paired">Только в паре</option>
                                        <option value="unpaired">Без пары</option>
                                        <option value="active">Активные (7 дней)</option>
                                        <option value="test">Тест (конкретный ID)</option>
                                    </select>
                                </div>

                                {targetGroup === 'test' && (
                                    <div className="form-group">
                                        <label>ID пользователя (тест)</label>
                                        <input
                                            type="text"
                                            placeholder="123456789"
                                            value={broadcastTestId}
                                            onChange={(e) => setBroadcastTestId(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Текст сообщения (Markdown)</label>
                                    <textarea
                                        placeholder="*Жирный*, _курсив_, [ссылка](url)"
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        rows={6}
                                    />
                                </div>

                                <div className="form-group-row">
                                    <div className="form-group">
                                        <label>Текст кнопки (опционально)</label>
                                        <input
                                            type="text"
                                            placeholder="Открыть"
                                            value={broadcastLink.text}
                                            onChange={(e) => setBroadcastLink({ ...broadcastLink, text: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ссылка кнопки</label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={broadcastLink.url}
                                            onChange={(e) => setBroadcastLink({ ...broadcastLink, url: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={sendBroadcast}
                                    disabled={sending || !broadcastMessage.trim()}
                                    className="send-btn"
                                >
                                    {sending ? '📤 Отправка...' : '📤 Отправить рассылку'}
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
                    )}

                    {/* Promo Codes Tab */}
                    {activeTab === 'promo' && (
                        <div className="panel promo-panel">
                            <h3>🎟️ Управление промокодами</h3>

                            <div className="promo-form">
                                <input
                                    placeholder="КОД (напр. LOVE40)"
                                    value={newPromo.code}
                                    onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                                />
                                <select value={newPromo.type} onChange={e => setNewPromo({ ...newPromo, type: e.target.value })}>
                                    <option value="premium">Премиум (дней)</option>
                                    <option value="discount">Скидка (%)</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Значение"
                                    value={newPromo.value}
                                    onChange={e => setNewPromo({ ...newPromo, value: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Лимит (пусто = ∞)"
                                    value={newPromo.usageLimit}
                                    onChange={e => setNewPromo({ ...newPromo, usageLimit: e.target.value })}
                                />
                                <button onClick={createPromoCode}>Добавить</button>
                            </div>

                            <div className="users-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Код</th>
                                            <th>Тип</th>
                                            <th>Значение</th>
                                            <th>Использовано</th>
                                            <th>Лимит</th>
                                            <th>Ссылка</th>
                                            <th>Действие</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {promoCodes.map(p => (
                                            <tr key={p.id}>
                                                <td><strong>{p.code}</strong></td>
                                                <td>{p.type === 'premium' ? '🎁 Премиум' : '💰 Скидка'}</td>
                                                <td>{p.value} {p.type === 'premium' ? 'дн.' : '%'}</td>
                                                <td>{p.timesUsed}</td>
                                                <td>{p.usageLimit || '∞'}</td>
                                                <td>
                                                    <code style={{ fontSize: '10px' }}>
                                                        t.me/pulse_relationship_bot?start=promo_{p.code}
                                                    </code>
                                                </td>
                                                <td>
                                                    <button className="delete-btn-cell" onClick={() => deletePromoCode(p.id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="panel settings-panel">
                            <h3>⚙️ Настройки</h3>

                            {/* AI Psychologist Section */}
                            <div className="settings-section">
                                <h4>🧠 AI Психолог</h4>
                                <div className="setting-row">
                                    <label>Доступ для всех пользователей</label>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={appSettings.ai_enabled === 'true'}
                                            onChange={(e) => setAppSettings(prev => ({
                                                ...prev,
                                                ai_enabled: e.target.checked ? 'true' : 'false',
                                            }))}
                                        />
                                        <span className="toggle-slider" />
                                    </label>
                                </div>
                                <div className="setting-row">
                                    <label>Дневной лимит сообщений</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.ai_daily_limit}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            ai_daily_limit: e.target.value,
                                        }))}
                                        min="1"
                                        max="100"
                                    />
                                </div>
                                <p className="setting-hint">Премиум-пользователи имеют безлимитный доступ</p>
                            </div>

                            {/* Pricing Section */}
                            <div className="settings-section">
                                <h4>💰 Цены подписки (Stars)</h4>
                                <div className="setting-row">
                                    <label>1 месяц</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.pricing_monthly}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            pricing_monthly: e.target.value,
                                        }))}
                                    />
                                </div>
                                <div className="setting-row">
                                    <label>6 месяцев</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.pricing_6month}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            pricing_6month: e.target.value,
                                        }))}
                                    />
                                </div>
                                <div className="setting-row">
                                    <label>1 год</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.pricing_yearly}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            pricing_yearly: e.target.value,
                                        }))}
                                    />
                                </div>
                                <div className="setting-row">
                                    <label>Скидка (%)</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.pricing_discount}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            pricing_discount: e.target.value,
                                        }))}
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div className="setting-row">
                                    <label>Лимит дат (Free)</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.free_dates_limit}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            free_dates_limit: e.target.value,
                                        }))}
                                    />
                                </div>
                                <div className="setting-row">
                                    <label>Лимит желаний (Free)</label>
                                    <input
                                        type="number"
                                        className="setting-input"
                                        value={appSettings.free_wishes_limit}
                                        onChange={(e) => setAppSettings(prev => ({
                                            ...prev,
                                            free_wishes_limit: e.target.value,
                                        }))}
                                    />
                                </div>
                            </div>

                            {/* Save Settings Button */}
                            <button
                                className="primary-btn"
                                disabled={settingsLoading}
                                onClick={async () => {
                                    setSettingsLoading(true);
                                    setSettingsSaved(false);
                                    try {
                                        const res = await fetch(`${API_URL}/api/admin/settings`, {
                                            method: 'PUT',
                                            headers: { ...headers, 'Content-Type': 'application/json' },
                                            body: JSON.stringify(appSettings),
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            setAppSettings(data);
                                            setSettingsSaved(true);
                                            setTimeout(() => setSettingsSaved(false), 3000);
                                        }
                                    } catch (err) {
                                        console.error('Save settings error:', err);
                                    }
                                    setSettingsLoading(false);
                                }}
                            >
                                {settingsLoading ? '⏳ Сохранение...' : settingsSaved ? '✅ Сохранено!' : '💾 Сохранить настройки'}
                            </button>

                            {/* Danger Zone */}
                            <div className="settings-section" style={{ marginTop: '32px' }}>
                                <h4>🗑️ Опасная зона</h4>
                                <p>Удаление всех данных из базы. Это действие необратимо!</p>
                                <button className="danger-btn" onClick={clearAllData}>
                                    🗑️ Удалить все данные
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
