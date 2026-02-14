require('dotenv').config();
const { AppSetting, User, Pair, AiChat, sequelize } = require('./src/models');
const aiService = require('./src/services/aiService');
const authService = require('./src/services/authService');
const paymentService = require('./src/services/paymentService');

async function test() {
    try {
        console.log('1. Connecting to DB...');
        await sequelize.authenticate();
        console.log('DB Connected.');

        console.log('2. Testing AppSettings...');
        const settings = await AppSetting.findAll();
        console.log('AppSettings found:', settings.length);

        console.log('3. Testing User/Auth...');
        // Mock user data
        const mockUser = { id: 123456789, first_name: 'Test', username: 'testuser' };
        const user = await authService.getOrCreateUser(mockUser);
        console.log('User fetched:', user.id);

        console.log('4. Testing Pair...');
        const pair = await authService.getUserPair(user.id);
        console.log('Pair fetched:', pair ? pair.id : 'None');

        if (pair) {
            console.log('5. Testing AI History...');
            const history = await aiService.getChatHistory(pair.id);
            console.log('History fetched, count:', history.length);
        }

        console.log('6. Testing Payment Status logic...');
        // logic from routes/payments.js
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        const monthly = parseInt(settingsMap.pricing_monthly || '299');
        console.log('Pricing calculated:', monthly);

        console.log('ALL TESTS PASSED');
    } catch (error) {
        console.error('TEST FAILED:', error);
    } finally {
        await sequelize.close();
    }
}

test();
