const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const catalog = require('./catalog');

// 1. Initialize Redis
const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.log('Redis Client Error', err));
redis.connect().then(() => console.log('Connected to Upstash Redis'));

// 2. Initialize Bot & Express
const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * UI: Helper for Visual Consistency
 */
const uiHeader = (title) => `<b>━━━━━━━━━━━━━━━━━━</b>\n<b>${title}</b>\n<b>━━━━━━━━━━━━━━━━━━</b>\n\n`;

// 3. Main Menu
bot.start((ctx) => {
    const buttons = Object.keys(catalog).map(key => [Markup.button.callback(catalog[key].title, `cat_${key}`)]);
    ctx.replyWithHTML(
        uiHeader('🔥 T-BOT PREMIUM HUB') + 'Welcome back! Select a category to start browsing:',
        Markup.inlineKeyboard(buttons)
    );
});

// 4. Category / Subcategory Logic
bot.action(/^cat_(.+?)$/, async (ctx) => {
    const catId = ctx.match[1];
    const cat = catalog[catId];
    if (!cat) return ctx.answerCbQuery('Category not found!');

    let buttons = [];
    
    // A. Add Subcategories (if any)
    if (cat.subcategories) {
        Object.keys(cat.subcategories).forEach(subId => {
            buttons.push([Markup.button.callback(`📁 ${cat.subcategories[subId].title}`, `sub_${catId}_${subId}`)]);
        });
    }

    // B. Add direct items (if any)
    if (cat.items) {
        cat.items.forEach(item => {
            buttons.push([Markup.button.callback(`🔹 ${item.name}`, `item_p_${catId}_${item.id}`)]);
        });
    }

    buttons.push([Markup.button.callback('⬅️ Back to Menu', 'main_menu')]);

    await ctx.editMessageText(uiHeader(cat.title) + 'Choose a section or item below:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

// 5. Handle Subcategory Menu
bot.action(/^sub_(.+?)_(.+?)$/, async (ctx) => {
    const catId = ctx.match[1];
    const subId = ctx.match[2];
    const sub = catalog[catId]?.subcategories?.[subId];
    if (!sub) return ctx.answerCbQuery('Subcategory not found!');

    const buttons = sub.items.map(item => [
        Markup.button.callback(`🔹 ${item.name}`, `item_s_${catId}_${subId}_${item.id}`)
    ]);
    buttons.push([Markup.button.callback('⬅️ Back', `cat_${catId}`)]);

    await ctx.editMessageText(uiHeader(sub.title) + 'Select an item to view details:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

// 6. Handle Item Details (Supports Parent-Item or Subcat-Item)
bot.action(/^item_(p|s)_(.+?)$/, async (ctx) => {
    const type = ctx.match[1];
    const parts = ctx.match[2].split('_');
    
    let catId, subId, itemId, item, backAction;

    if (type === 'p') {
        [catId, itemId] = parts;
        item = catalog[catId]?.items.find(i => i.id === itemId);
        backAction = `cat_${catId}`;
    } else {
        [catId, subId, itemId] = parts;
        item = catalog[catId]?.subcategories?.[subId]?.items.find(i => i.id === itemId);
        backAction = `sub_${catId}_${subId}`;
    }

    if (!item) return ctx.answerCbQuery('Item not found!');

    await ctx.editMessageText(
        uiHeader(`📦 ${item.name}`) + `${item.description}\n\n⚠️ <i>Note: This link will expire in 5 minutes.</i>`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Generate Fresh Link', `link_${ctx.match[0].replace('item_', '')}`)],
                [Markup.button.callback('⬅️ Back', backAction)]
            ])
        }
    );
});

// 7. Handle Link Generation
bot.action(/^link_(p|s)_(.+?)$/, async (ctx) => {
    const type = ctx.match[1];
    const parts = ctx.match[2].split('_');
    let item;

    if (type === 'p') {
        const [catId, itemId] = parts;
        item = catalog[catId]?.items.find(i => i.id === itemId);
    } else {
        const [catId, subId, itemId] = parts;
        item = catalog[catId]?.subcategories?.[subId]?.items.find(i => i.id === itemId);
    }

    if (!item) return ctx.answerCbQuery('Item not found!');

    await ctx.answerCbQuery('Generating unique secure link...');
    const token = uuidv4();
    await redis.set(token, item.url, { EX: 300 });
    const bouncerUrl = `${process.env.BASE_URL}/dl/${token}`;

    const sentMessage = await ctx.replyWithHTML(
        `<b>✅ Access Granted!</b>\n` +
        `━━━━━━━━━━━━━━\n` +
        `📁 <code>${item.name}</code>\n` +
        `⏱ <b>Expires:</b> 5 Minutes\n` +
        `━━━━━━━━━━━━━━\n\n` +
        `<i>Click below to open:</i>`,
        Markup.inlineKeyboard([[Markup.button.url('⬇️ Download / Watch Now', bouncerUrl)]])
    );

    setTimeout(() => {
        ctx.telegram.deleteMessage(ctx.chat.id, sentMessage.message_id).catch(() => {});
    }, 300000);
});

// 8. Main Menu / Health / Redirect
bot.action('main_menu', async (ctx) => {
    const buttons = Object.keys(catalog).map(key => [Markup.button.callback(catalog[key].title, `cat_${key}`)]);
    await ctx.editMessageText(uiHeader('🔥 T-BOT PREMIUM HUB') + 'Please select a category:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

app.get('/health', (req, res) => res.send('Bot is Alive!'));
app.get('/dl/:token', async (req, res) => {
    const realUrl = await redis.get(req.params.token);
    realUrl ? res.redirect(realUrl) : res.status(410).send('<h1>⚠️ Link Expired</h1>');
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
bot.launch().then(() => console.log('Bot is running...'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));