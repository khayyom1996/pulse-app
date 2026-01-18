const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const authService = require('../services/authService');
const { User, Pair, LoveClick } = require('../models');

const bot = new Telegraf(config.telegramBotToken);

// Start command - register user and show main menu
bot.command('start', async (ctx) => {
    try {
        const telegramUser = ctx.from;
        const chatId = ctx.chat.id; // Get chat ID for messaging
        const user = await authService.getOrCreateUser(telegramUser, chatId);
        const pair = await authService.getUserPair(user.id);

        // Check for deep link (invite code or promo code)
        const startPayload = ctx.message.text.split(' ')[1];

        if (startPayload && startPayload.startsWith('invite_')) {
            const inviteCode = startPayload.replace('invite_', '');
            const result = await authService.joinPair(user.id, inviteCode);
            // ... (rest of join logic)
            if (result.error) {
                await ctx.reply(`❌ ${result.error}`);
            } else {
                const successMessage = `
💕 *Поздравляем\\!*

Вы успешно связаны с партнёром\\!

Теперь вы можете:
• Отправлять друг другу любовь ❤️
• Отмечать важные даты 📅
• Находить общие желания ✨
• Выращивать дерево любви 🌳

Нажмите кнопку ниже, чтобы начать\\!
`;
                await ctx.replyWithMarkdownV2(successMessage, getWelcomeKeyboard(true));

                // Notify partner
                const partnerId = result.pair.user1Id;
                try {
                    await bot.telegram.sendMessage(
                        partnerId,
                        `💕 ${user.firstName || 'Ваш партнёр'} присоединился к вам в Pulse!\n\nОткройте приложение, чтобы начать.`,
                        getWelcomeKeyboard(true)
                    );
                } catch (e) {
                    console.error('Could not notify partner:', e.message);
                }
                return;
            }
        } else if (startPayload && startPayload.startsWith('promo_')) {
            const promoCode = startPayload.replace('promo_', '');
            const promoService = require('../services/promoService');
            const result = await promoService.applyCode(user.id, promoCode);

            if (result.error) {
                await ctx.reply(`❌ Ошибка активации: ${result.error === 'invalid_code' ? 'Код не найден' : 'Код не активен'}`);
            } else {
                if (result.type === 'premium') {
                    const message = `✨ *Pulse Plus активирован\\!*\n\nВы получили ${result.days} дней премиум\\-доступа через промокод\\!`;
                    await ctx.replyWithMarkdownV2(message, getWelcomeKeyboard(pair && pair.user2Id, pair?.inviteCode));
                } else {
                    const message = `✨ *Промокод на скидку ${result.discount}% применен\\!*\n\nИспользуйте его при оформлении Pulse Plus в приложении\\.`;
                    await ctx.replyWithMarkdownV2(message, getWelcomeKeyboard(pair && pair.user2Id, pair?.inviteCode));
                }
            }
            return;
        }

        // Regular start - show beautiful welcome
        if (pair && pair.user2Id) {
            // Paired user
            const partnerName = pair.user1Id === user.id
                ? pair.user2?.firstName || 'партнёром'
                : pair.user1?.firstName || 'партнёром';
            const streak = pair.TreeStreak?.currentStreak || 0;
            const treeLevel = pair.TreeStreak?.treeLevel || 1;
            const treeEmojis = ['🌱', '🌿', '🌳', '🌲', '🌸'];
            const treeEmoji = treeEmojis[Math.min(treeLevel - 1, 4)];

            const pairedMessage = `
💕 *Привет, ${escapeMarkdown(user.firstName || 'друг')}\\!*

Вы связаны с *${escapeMarkdown(partnerName)}*

${treeEmoji} *Ваше дерево*: уровень ${treeLevel}
🔥 *Streak*: ${streak} дней подряд
💌 *Статус*: Отношения процветают\\!

Отправьте любовь прямо сейчас\\!
`;
            await ctx.replyWithMarkdownV2(pairedMessage, getWelcomeKeyboard(true));
        } else {
            // Unpaired user - beautiful onboarding
            const welcomeMessage = `
💕 *Добро пожаловать в Pulse\\!*

Pulse — это приложение для пар, которое поможет вам:

❤️ *Отправлять любовь* одним нажатием
📅 *Помнить важные даты* \\(годовщины, дни рождения\\)
✨ *Находить общие желания* через свайпы
🌳 *Выращивать дерево любви* вместе

${pair ? `📎 *Ваш код приглашения:* \`${pair.inviteCode}\`\n\nОтправьте его партнёру\\!` : 'Создайте пару и пригласите партнёра\\!'}
`;
            await ctx.replyWithMarkdownV2(welcomeMessage, getWelcomeKeyboard(false, pair?.inviteCode));
        }
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Helper to escape markdown v2 special characters
function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Welcome keyboard with inline buttons
function getWelcomeKeyboard(isPaired, inviteCode = null) {
    const buttons = [
        [{ text: '🚀 Начать приключение', web_app: { url: config.webappUrl } }],
    ];

    if (!isPaired && inviteCode) {
        const inviteLink = `https://t.me/${config.botUsername}?start=invite_${inviteCode}`;
        const shareText = `Присоединяйся ко мне в Pulse! Будем вместе выращивать наше дерево любви и исполнять желания ✨💕`;
        buttons.push([
            { text: '💕 Поделиться с партнёром', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}` },
        ]);
    }

    buttons.push([
        { text: '⭐️ Pulse Plus', web_app: { url: `${config.webappUrl}/premium` } },
        { text: '❓ Как работает Pulse', callback_data: 'how_it_works' },
    ]);

    return { reply_markup: { inline_keyboard: buttons } };
}

// Callback: Get invite code
bot.action('get_invite_code', async (ctx) => {
    try {
        const user = await authService.getOrCreateUser(ctx.from);
        const { pair } = await authService.createPair(user.id);

        if (pair.user2Id) {
            await ctx.answerCbQuery('Вы уже связаны с партнёром! 💕');
            return;
        }

        const inviteLink = `https://t.me/${config.botUsername}?start=invite_${pair.inviteCode}`;

        await ctx.editMessageText(
            `📎 *Ваш код приглашения:*\n\n\`${pair.inviteCode}\`\n\nИли отправьте эту ссылку партнёру:\n${inviteLink}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📤 Поделиться', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Присоединяйся ко мне в Pulse! 💕')}` }],
                        [{ text: '◀️ Назад', callback_data: 'back_to_start' }],
                    ],
                },
            }
        );
    } catch (error) {
        console.error('Get invite code error:', error);
        await ctx.answerCbQuery('Ошибка. Попробуйте позже.');
    }
});

// Callback: Enter invite code
bot.action('enter_invite_code', async (ctx) => {
    await ctx.editMessageText(
        '📝 *Введите код партнёра*\n\nОтправьте 8-символьный код, который дал вам партнёр:',
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '◀️ Назад', callback_data: 'back_to_start' }],
                ],
            },
        }
    );
    // Set state to expect code
    ctx.session = ctx.session || {};
    ctx.session.awaitingCode = true;
});

// Callback: How it works
bot.action('how_it_works', async (ctx) => {
    const helpText = `
❓ *Как работает Pulse?*

*1\\. Создайте пару*
Один из партнёров создаёт код и отправляет его второму\\.

*2\\. Отправляйте любовь*
Нажмите большую кнопку\\-сердце, чтобы партнёр получил уведомление о том, что вы думаете о нём\\.

*3\\. Отмечайте даты*
Добавляйте важные даты и получайте напоминания\\.

*4\\. Находите общие желания*
Свайпайте карточки желаний — при совпадении вы узнаете, чего хотите оба\\.

*5\\. Выращивайте дерево*
Чем дольше вы активны вместе, тем больше растёт ваше дерево любви\\!
`;
    await ctx.editMessageText(helpText, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💕 Открыть Pulse', web_app: { url: config.webappUrl } }],
                [{ text: '◀️ Назад', callback_data: 'back_to_start' }],
            ],
        },
    });
});

// Callback: Back to start
bot.action('back_to_start', async (ctx) => {
    try {
        const user = await authService.getOrCreateUser(ctx.from);
        const pair = await authService.getUserPair(user.id);

        const welcomeMessage = pair && pair.user2Id
            ? `💕 Вы связаны с партнёром!\n\nОткройте приложение, чтобы продолжить.`
            : `💕 Добро пожаловать в Pulse!\n\nСоздайте пару или введите код партнёра.`;

        await ctx.editMessageText(welcomeMessage, getWelcomeKeyboard(pair && pair.user2Id, pair?.inviteCode));
    } catch (error) {
        console.error('Back to start error:', error);
    }
});

// Handle text messages (for invite code input)
bot.on('text', async (ctx) => {
    // Check if user is entering invite code
    const text = ctx.message.text.toUpperCase().trim();

    // If it looks like an invite code (8 alphanumeric chars)
    if (/^[A-Z0-9]{8}$/.test(text)) {
        const user = await authService.getOrCreateUser(ctx.from);
        const result = await authService.joinPair(user.id, text);

        if (result.error) {
            await ctx.reply(`❌ ${result.error}\n\nПопробуйте ещё раз или попросите партнёра отправить новый код.`);
        } else {
            await ctx.reply(
                '💕 *Поздравляем\\!*\n\nВы успешно связаны с партнёром\\!\nОткройте приложение, чтобы начать\\.',
                {
                    parse_mode: 'MarkdownV2',
                    ...getWelcomeKeyboard(true),
                }
            );

            // Notify partner
            try {
                await bot.telegram.sendMessage(
                    result.pair.user1Id,
                    `💕 ${user.firstName || 'Ваш партнёр'} присоединился к вам в Pulse!`,
                    getWelcomeKeyboard(true)
                );
            } catch (e) {
                console.error('Could not notify partner:', e.message);
            }
        }
    }
});

// Premium command - show premium info and link
bot.command('premium', async (ctx) => {
    const premiumText = `
⭐ *Pulse Plus* — новый уровень ваших отношений!

Что вы получите:
🧠 *ИИ Психолог* — безлимитное общение и советы
🌳 *Эксклюзивные деревья* — новые уровни и формы
✨ *Тайные желания* — безлимитные совпадения
🚀 *Приоритет* — доступ к новым функциям первым

💎 Стоимость: всего от 150 звёзд в месяц!
`;
    await ctx.replyWithMarkdownV2(escapeMarkdown(premiumText), {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💎 Получить Pulse Plus', web_app: { url: `${config.webappUrl}/premium` } }],
                [{ text: '◀️ Назад', callback_data: 'back_to_start' }],
            ],
        },
    });
});

// Link command - create or get invite link
bot.command('link', async (ctx) => {
    try {
        const telegramUser = ctx.from;
        const user = await authService.getOrCreateUser(telegramUser);
        const { pair, isNew } = await authService.createPair(user.id);

        if (pair.user2Id) {
            await ctx.reply('💕 Вы уже связаны с партнером!');
            return;
        }

        const inviteLink = `https://t.me/${config.botUsername}?start=invite_${pair.inviteCode}`;

        await ctx.reply(
            `📎 Отправьте эту ссылку вашему партнеру:\n\n${inviteLink}\n\nИли код: ${pair.inviteCode}`,
            Markup.inlineKeyboard([
                Markup.button.url('Поделиться', `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Присоединяйся ко мне в Pulse! 💕')}`),
            ])
        );
    } catch (error) {
        console.error('Link command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Unlink command - disconnect pair
bot.command('unlink', async (ctx) => {
    try {
        const user = await authService.getOrCreateUser(ctx.from);
        const pair = await authService.getUserPair(user.id);

        if (!pair) {
            await ctx.reply('Вы не связаны с партнером.');
            return;
        }

        await ctx.reply(
            '⚠️ Вы уверены, что хотите разорвать связь?\n\nЭто действие нельзя отменить.',
            Markup.inlineKeyboard([
                Markup.button.callback('❌ Да, разорвать', 'confirm_unlink'),
                Markup.button.callback('💕 Нет, остаться', 'cancel_unlink'),
            ])
        );
    } catch (error) {
        console.error('Unlink command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Callback: confirm unlink
bot.action('confirm_unlink', async (ctx) => {
    try {
        const user = await User.findByPk(ctx.from.id);
        const pair = await authService.getUserPair(user.id);

        if (pair) {
            await pair.update({ isActive: false });
        }

        await ctx.editMessageText('Связь разорвана. Используйте /link для создания новой пары.');
    } catch (error) {
        console.error('Confirm unlink error:', error);
        await ctx.reply('Произошла ошибка.');
    }
});

// Callback: cancel unlink
bot.action('cancel_unlink', async (ctx) => {
    await ctx.editMessageText('💕 Отлично! Ваша связь сохранена.');
});

// Send love notification to partner (called from API)
async function sendLoveNotification(receiverId, senderName, message = null) {
    try {
        const text = message
            ? `💕 ${senderName} отправил вам любовь:\n\n"${message}"`
            : `💕 ${senderName} думает о вас и отправляет любовь!`;

        await bot.telegram.sendMessage(receiverId, text, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '💕 Открыть Pulse', web_app: { url: config.webappUrl } },
                ]],
            },
        });
        return true;
    } catch (error) {
        console.error('Send notification error:', error.message);
        return false;
    }
}

// Send notification about new date
async function sendDateNotification(receiverId, creatorName, title, eventDate, category = 'custom') {
    try {
        const categoryEmojis = {
            anniversary: '💍',
            birthday: '🎂',
            first_date: '💕',
            custom: '📅',
        };
        const emoji = categoryEmojis[category] || '📅';
        const formattedDate = new Date(eventDate).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        const text = `${emoji} ${creatorName} добавил(а) важную дату:\n\n*${title}*\n📅 ${formattedDate}`;

        await bot.telegram.sendMessage(receiverId, text, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '📅 Открыть даты', web_app: { url: `${config.webappUrl}/dates` } },
                ]],
            },
        });
        return true;
    } catch (error) {
        console.error('Send date notification error:', error.message);
        return false;
    }
}

// Main keyboard helper
function getMainKeyboard(isPaired = false) {
    return Markup.keyboard([
        [Markup.button.webApp('💕 Открыть Pulse', config.webappUrl)],
        [isPaired ? '/link' : '/link - Пригласить'],
    ]).resize();
}

// Handle pre-checkout queries (must answer within 10 seconds)
bot.on('pre_checkout_query', (ctx) => {
    ctx.answerPreCheckoutQuery(true).catch(err => {
        console.error('Pre-checkout query error:', err);
    });
});

// Handle successful payments
bot.on('successful_payment', async (ctx) => {
    try {
        const payload = ctx.message.successful_payment.invoice_payload;
        const chargeId = ctx.message.successful_payment.telegram_payment_charge_id;

        // We require PaymentService here to avoid circular dependency if possible
        // or just use the service directly if it doesn't cause issues
        const paymentService = require('../services/paymentService');
        await paymentService.handleSuccessfulPayment(payload, chargeId);

        console.log(`✅ Payment successful for payload: ${payload}`);
        await ctx.reply('✨ Спасибо за покупку Pulse Plus! Ваша подписка активирована.');
    } catch (error) {
        console.error('Successful payment handler error:', error);
    }
});

module.exports = { bot, sendLoveNotification, sendDateNotification };

