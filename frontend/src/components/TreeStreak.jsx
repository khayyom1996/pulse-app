import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './TreeStreak.css';

// SVG paths for different tree stages
const TREE_STAGES = {
    1: { // Sprout
        trunk: 'M50 95 L50 80',
        leaves: 'M50 80 C40 70, 35 75, 40 65 C35 60, 45 55, 50 50 C55 55, 65 60, 60 65 C65 75, 60 70, 50 80',
        color: '#a8e6cf',
    },
    2: { // Seedling
        trunk: 'M50 95 L50 70',
        leaves: 'M50 70 C35 60, 25 65, 35 50 C25 45, 40 35, 50 30 C60 35, 75 45, 65 50 C75 65, 65 60, 50 70',
        color: '#7ed56f',
    },
    3: { // Young tree
        trunk: 'M50 95 L50 55',
        leaves: 'M50 55 C30 45, 15 50, 30 35 C15 30, 35 15, 50 10 C65 15, 85 30, 70 35 C85 50, 70 45, 50 55',
        color: '#55c57a',
    },
    4: { // Mature tree
        trunk: 'M48 95 L48 50 M52 95 L52 50',
        leaves: 'M50 50 C25 40, 10 45, 25 25 C10 20, 30 5, 50 3 C70 5, 90 20, 75 25 C90 45, 75 40, 50 50',
        color: '#28b485',
    },
    5: { // Blooming tree
        trunk: 'M46 95 L46 45 M54 95 L54 45',
        leaves: 'M50 45 C20 35, 5 40, 20 18 C5 12, 28 0, 50 0 C72 0, 95 12, 80 18 C95 40, 80 35, 50 45',
        color: '#20a779',
        flowers: true,
    },
};

const LEVEL_NAMES = ['sprout', 'seedling', 'young', 'mature', 'blooming'];

export default function TreeStreak({ level = 1, currentStreak = 0, maxStreak = 0 }) {
    const { t } = useTranslation();
    const tree = TREE_STAGES[level] || TREE_STAGES[1];
    const levelName = t(`tree.level_${level}`);

    // Calculate days to next level
    const thresholds = [0, 7, 21, 50, 100];
    const nextThreshold = thresholds[level] || 100;
    const daysToNext = level < 5 ? nextThreshold - currentStreak : 0;

    return (
        <div className="tree-streak">
            <motion.div
                className="tree-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
            >
                <svg viewBox="0 0 100 100" className="tree-svg">
                    {/* Ground */}
                    <ellipse cx="50" cy="97" rx="30" ry="5" fill="#8b4513" opacity="0.3" />

                    {/* Trunk */}
                    <motion.path
                        d={tree.trunk}
                        stroke="#8b4513"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Leaves */}
                    <motion.path
                        d={tree.leaves}
                        fill={tree.color}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        style={{ transformOrigin: '50px 50px' }}
                    />

                    {/* Flowers for blooming stage */}
                    {tree.flowers && (
                        <motion.g
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 1 }}
                        >
                            <circle cx="30" cy="20" r="4" fill="#ff6b9d" />
                            <circle cx="50" cy="10" r="5" fill="#ff8e8e" />
                            <circle cx="70" cy="20" r="4" fill="#ff6b9d" />
                            <circle cx="25" cy="35" r="3" fill="#ffb6c1" />
                            <circle cx="75" cy="35" r="3" fill="#ffb6c1" />
                        </motion.g>
                    )}
                </svg>
            </motion.div>

            <div className="tree-info">
                <h3 className="tree-level">{levelName}</h3>
                <div className="tree-stats">
                    <div className="stat">
                        <span className="stat-value">{currentStreak}</span>
                        <span className="stat-label">{t('home.streak')}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">🏆 {maxStreak}</span>
                        <span className="stat-label">Рекорд</span>
                    </div>
                </div>

                {level < 5 && daysToNext > 0 && (
                    <p className="tree-progress">
                        {t('tree.days_to_next', { days: daysToNext })}
                    </p>
                )}
            </div>
        </div>
    );
}
