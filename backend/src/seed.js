/**
 * Seed script for wish cards
 * Run: node src/seed.js
 */
require('dotenv').config();
const sequelize = require('./config/database');
const { WishCard } = require('./models');

const wishCards = [
    // Romance
    { category: 'romance', textRu: 'Устроить романтический ужин при свечах дома', textEn: 'Have a candlelit dinner at home', textTg: 'Шамъҳо гузоштан барои хӯроки романтикӣ дар хона', emoji: '🕯️' },
    { category: 'romance', textRu: 'Написать друг другу любовные письма', textEn: 'Write love letters to each other', textTg: 'Ба ҳамдигар номаҳои муҳаббатӣ навиштан', emoji: '💌' },
    { category: 'romance', textRu: 'Смотреть на звёзды вместе', textEn: 'Stargaze together', textTg: 'Якҷоя ба ситораҳо тамошо кардан', emoji: '⭐' },
    { category: 'romance', textRu: 'Устроить пикник на закате', textEn: 'Have a sunset picnic', textTg: 'Вақти ғуруби офтоб пикник кардан', emoji: '🌅' },
    { category: 'romance', textRu: 'Танцевать дома под любимую музыку', textEn: 'Dance at home to favorite music', textTg: 'Дар хона раққосӣ кардан бо мусиқии дӯстдошта', emoji: '💃' },
    { category: 'romance', textRu: 'Сделать массаж друг другу', textEn: 'Give each other massages', textTg: 'Ба ҳамдигар массаж кардан', emoji: '💆' },
    { category: 'romance', textRu: 'Пересмотреть фильм с первого свидания', textEn: 'Rewatch our first date movie', textTg: 'Филми аввалин вохӯриро дубора тамошо кардан', emoji: '🎬' },
    { category: 'romance', textRu: 'Провести день без телефонов', textEn: 'Spend a phone-free day', textTg: 'Як рӯз бе телефон гузаронидан', emoji: '📵' },

    // Adventure
    { category: 'adventure', textRu: 'Поехать в спонтанное путешествие', textEn: 'Take a spontaneous trip', textTg: 'Саёҳати ногаҳонӣ кардан', emoji: '🚗' },
    { category: 'adventure', textRu: 'Попробовать новый экстремальный вид спорта', textEn: 'Try a new extreme sport', textTg: 'Варзиши экстремалии навро озмудан', emoji: '🪂' },
    { category: 'adventure', textRu: 'Провести ночь под открытым небом', textEn: 'Sleep under the stars', textTg: 'Шабро зери осмони кушода гузаронидан', emoji: '⛺' },
    { category: 'adventure', textRu: 'Научиться чему-то новому вместе', textEn: 'Learn something new together', textTg: 'Якҷоя чизи нав омӯхтан', emoji: '📚' },
    { category: 'adventure', textRu: 'Посетить место из списка желаний', textEn: 'Visit a bucket list destination', textTg: 'Ба ҷои орзуӣ сафар кардан', emoji: '✈️' },
    { category: 'adventure', textRu: 'Устроить фотосессию вместе', textEn: 'Have a photoshoot together', textTg: 'Якҷоя аксбардорӣ кардан', emoji: '📸' },
    { category: 'adventure', textRu: 'Готовить блюдо новой кухни', textEn: 'Cook a new cuisine together', textTg: 'Хӯроки нав пухтан', emoji: '👨‍🍳' },
    { category: 'adventure', textRu: 'Пойти в поход в горы', textEn: 'Go hiking in the mountains', textTg: 'Ба кӯҳҳо сайр кардан', emoji: '🏔️' },

    // Leisure
    { category: 'leisure', textRu: 'Сходить в кино на премьеру', textEn: 'Go to a movie premiere', textTg: 'Ба кино рафтан', emoji: '🍿' },
    { category: 'leisure', textRu: 'Поиграть в настольные игры весь вечер', textEn: 'Have a board game night', textTg: 'Шаб бозии мизӣ бозидан', emoji: '🎲' },
    { category: 'leisure', textRu: 'Посетить спа вместе', textEn: 'Visit a spa together', textTg: 'Якҷоя ба спа рафтан', emoji: '🧖' },
    { category: 'leisure', textRu: 'Устроить марафон сериала', textEn: 'Have a TV series marathon', textTg: 'Марафони филмҳо тамошо кардан', emoji: '📺' },
    { category: 'leisure', textRu: 'Пойти на концерт', textEn: 'Go to a concert', textTg: 'Ба консерт рафтан', emoji: '🎤' },
    { category: 'leisure', textRu: 'Поиграть в видеоигры вместе', textEn: 'Play video games together', textTg: 'Якҷоя бозии видеоӣ бозидан', emoji: '🎮' },
    { category: 'leisure', textRu: 'Устроить день самообслуживания', textEn: 'Have a self-care day', textTg: 'Рӯзи худпарасторӣ', emoji: '🧴' },
    { category: 'leisure', textRu: 'Посетить музей или выставку', textEn: 'Visit a museum or exhibition', textTg: 'Ба музей ё намоишгоҳ рафтан', emoji: '🖼️' },
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        await sequelize.sync({ force: true });
        console.log('✅ Tables created');

        // Insert wish cards
        for (let i = 0; i < wishCards.length; i++) {
            await WishCard.create({
                ...wishCards[i],
                sortOrder: i,
            });
        }
        console.log(`✅ Inserted ${wishCards.length} wish cards`);

        console.log('🎉 Seed completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
