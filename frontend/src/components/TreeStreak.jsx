import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './TreeStreak.css';

// Import tree images for each level
import tree1 from '../assets/trees/tree_1.png';
import tree2 from '../assets/trees/tree_2.png';
import tree3 from '../assets/trees/tree_3.png';
import tree4 from '../assets/trees/tree_4.png';
import tree5 from '../assets/trees/tree_5.png';
import tree6 from '../assets/trees/tree_6.png';
import tree7 from '../assets/trees/tree_7.png';
import tree8 from '../assets/trees/tree_8.png';
import tree9 from '../assets/trees/tree_9.png';
import tree10 from '../assets/trees/tree_10.png';

const TREE_IMAGES = {
    1: tree1,
    2: tree2,
    3: tree3,
    4: tree4,
    5: tree5,
    6: tree6,
    7: tree7,
    8: tree8,
    9: tree9,
    10: tree10,
};

const LEVEL_NAMES = [
    'sprout', 'seedling', 'young', 'growing', 'mature',
    'strong', 'blooming', 'ancient', 'legendary', 'eternal'
];

// Day thresholds for each level (1-10)
const THRESHOLDS = [0, 3, 7, 14, 21, 35, 50, 75, 100, 150];

export default function TreeStreak({ level = 1, currentStreak = 0, maxStreak = 0 }) {
    const { t } = useTranslation();
    const clampedLevel = Math.min(Math.max(level, 1), 10);
    const treeImage = TREE_IMAGES[clampedLevel];
    const levelName = t(`tree.level_${clampedLevel}`, { defaultValue: LEVEL_NAMES[clampedLevel - 1] });

    // Calculate progress to next level
    const nextThreshold = THRESHOLDS[clampedLevel] || 150;
    const prevThreshold = THRESHOLDS[clampedLevel - 1] || 0;
    const progress = clampedLevel < 10
        ? Math.min(((currentStreak - prevThreshold) / (nextThreshold - prevThreshold)) * 100, 100)
        : 100;
    const daysToNext = clampedLevel < 10 ? Math.max(nextThreshold - currentStreak, 0) : 0;

    return (
        <div className="tree-streak">
            <motion.div
                className="tree-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
            >
                <motion.img
                    src={treeImage}
                    alt={levelName}
                    className="tree-image"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                />
            </motion.div>

            <div className="tree-info">
                <h3 className="tree-level">{levelName}</h3>

                {/* Progress bar */}
                {clampedLevel < 10 && (
                    <div className="tree-progress-bar">
                        <motion.div
                            className="tree-progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                )}

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

                {clampedLevel < 10 && daysToNext > 0 && (
                    <p className="tree-progress">
                        {t('tree.days_to_next', { days: daysToNext })}
                    </p>
                )}
            </div>
        </div>
    );
}
