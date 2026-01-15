const User = require('./User');
const Pair = require('./Pair');
const LoveClick = require('./LoveClick');
const ImportantDate = require('./ImportantDate');
const WishCard = require('./WishCard');
const WishSwipe = require('./WishSwipe');
const WishMatch = require('./WishMatch');
const TreeStreak = require('./TreeStreak');
const AiChat = require('./AiChat');
const Payment = require('./Payment');

// User associations
User.hasOne(Pair, { as: 'pairAsUser1', foreignKey: 'user1Id' });
User.hasOne(Pair, { as: 'pairAsUser2', foreignKey: 'user2Id' });
User.hasMany(LoveClick, { as: 'sentLoves', foreignKey: 'senderId' });
User.hasMany(WishSwipe, { foreignKey: 'userId' });
User.hasMany(AiChat, { foreignKey: 'userId' });
User.hasMany(Payment, { foreignKey: 'userId' });

// Pair associations
Pair.belongsTo(User, { as: 'user1', foreignKey: 'user1Id' });
Pair.belongsTo(User, { as: 'user2', foreignKey: 'user2Id' });
Pair.hasMany(LoveClick, { foreignKey: 'pairId' });
Pair.hasMany(ImportantDate, { foreignKey: 'pairId' });
Pair.hasMany(WishSwipe, { foreignKey: 'pairId' });
Pair.hasMany(WishMatch, { foreignKey: 'pairId' });
Pair.hasOne(TreeStreak, { foreignKey: 'pairId' });
Pair.hasMany(AiChat, { foreignKey: 'pairId' });

// LoveClick associations
LoveClick.belongsTo(Pair, { foreignKey: 'pairId' });
LoveClick.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
LoveClick.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

// ImportantDate associations
ImportantDate.belongsTo(Pair, { foreignKey: 'pairId' });

// WishCard associations
WishCard.hasMany(WishSwipe, { foreignKey: 'cardId' });
WishCard.hasMany(WishMatch, { foreignKey: 'cardId' });

// WishSwipe associations
WishSwipe.belongsTo(User, { foreignKey: 'userId' });
WishSwipe.belongsTo(Pair, { foreignKey: 'pairId' });
WishSwipe.belongsTo(WishCard, { foreignKey: 'cardId' });

// WishMatch associations
WishMatch.belongsTo(Pair, { foreignKey: 'pairId' });
WishMatch.belongsTo(WishCard, { foreignKey: 'cardId' });

// TreeStreak associations
TreeStreak.belongsTo(Pair, { foreignKey: 'pairId' });

// AiChat associations
AiChat.belongsTo(Pair, { foreignKey: 'pairId' });
AiChat.belongsTo(User, { foreignKey: 'userId' });

// Payment associations
Payment.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    User,
    Pair,
    LoveClick,
    ImportantDate,
    WishCard,
    WishSwipe,
    WishMatch,
    TreeStreak,
    AiChat,
    Payment,
};


