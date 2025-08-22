// index.js
const {
    Client, Events, GatewayIntentBits, Collection,
    PermissionsBitField, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle
} = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const { InferenceClient } = require("@huggingface/inference");

require('dotenv').config();

// 1. تهيئة Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

// Collections لإدارة أوامر السلاش والأوامر النصية
client.commands = new Collection();
client.prefixCommands = new Collection();

// 2. تهيئة Hugging Face Inference Client
const HF_TOKEN = process.env.HF_TOKEN;
const HF_CHAT_PROVIDER = "novita";
const HF_CHAT_MODEL = "moonshotai/Kimi-K2-Instruct";

if (!HF_TOKEN) {
    console.error("خطأ: لم يتم تعيين متغير البيئة HF_TOKEN في ملف .env. لن يعمل تكامل Hugging Face AI.");
} else {
    client.hfInferenceClient = new InferenceClient(HF_TOKEN);
    console.log("✅ تم تهيئة Hugging Face Inference Client بنجاح.");
}

// 3. جزء تحميل أوامر السلاش
const slashCommandsPath = path.join(__dirname, 'slash', 'commands');
let slashCommandFolders = [];
try {
    slashCommandFolders = fs.readdirSync(slashCommandsPath);
} catch (error) {
    console.warn(`[تحذير] مجلد أوامر السلاش "${slashCommandsPath}" غير موجود أو لا يمكن قراءته:`, error.message);
    slashCommandFolders = [];
}

for (const folder of slashCommandFolders) {
    const commandsPath = path.join(slashCommandsPath, folder);
    if (!fs.lstatSync(commandsPath).isDirectory()) {
        continue;
    }
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[تحذير] أمر السلاش في ${filePath} مفقود منه خاصية "data" أو "execute" المطلوبة.`);
        }
    }
}

// 4. جزء تحميل الأوامر النصية (Prefix Commands)
const prefixCommandsPath = path.join(__dirname, 'prefix_commands');

const gamesManagerFile = path.join(prefixCommandsPath, 'games_manager.js');
if (fs.existsSync(gamesManagerFile)) {
    try {
        const gamesManager = require(gamesManagerFile);
        if (gamesManager.commands && Array.isArray(gamesManager.commands)) {
            for (const command of gamesManager.commands) {
                if ('name' in command && 'execute' in command) {
                    client.prefixCommands.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.prefixCommands.set(alias, command);
                        }
                    }
                } else {
                    console.log(`[تحذير] الأمر النصي في games_manager.js مفقود منه خاصية "name" أو "execute" المطلوبة.`);
                }
            }
            console.log(`تم تحميل ${gamesManager.commands.length} أمر (أوامر) من games_manager.js.`);
        } else {
            console.log(`[تحذير] ملف games_manager.js لا يصدر مصفوفة "commands" صحيحة.`);
        }
    } catch (error) {
        console.error(`[خطأ] فشل في تحميل ملف الألعاب المدمج "${gamesManagerFile}":`, error.message);
    }
} else {
    console.warn(`[تحذير] ملف الألعاب المدمج "${gamesManagerFile}" غير موجود.`);
}

const gameLogicPath = path.join(prefixCommandsPath, 'game_logic');
let gameLogicFiles = [];
try {
    if (fs.existsSync(gameLogicPath) && fs.lstatSync(gameLogicPath).isDirectory()) {
        gameLogicFiles = fs.readdirSync(gameLogicPath).filter(file => file.endsWith('.js'));
        for (const file of gameLogicFiles) {
            const filePath = path.join(gameLogicPath, file);
            const command = require(filePath);
            if ('name' in command && 'execute' in command) {
                client.prefixCommands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    for (const alias of command.aliases) {
                        client.prefixCommands.set(alias, command);
                    }
                }
            } else {
                console.log(`[تحذير] الأمر النصي في ${filePath} مفقود منه خاصية "name" أو "execute" المطلوبة.`);
            }
        }
        console.log(`تم تحميل ${gameLogicFiles.length} أمر (أوامر) من game_logic.`);
    } else {
        console.warn(`[تحذير] مجلد game_logic "${gameLogicPath}" غير موجود أو ليس مجلدًا.`);
    }
} catch (error) {
    console.error(`[خطأ] فشل في تحميل أوامر من مجلد game_logic:`, error.message);
}

// 5. معالجة الأحداث (Events)
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} جاهز للعمل!`);
});

client.on(Events.Error, console.error);

const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_BOT_TOKEN) {
    console.error("خطأ: لم يتم تعيين متغير البيئة DISCORD_BOT_TOKEN في ملف .env.");
    process.exit(1);
}
client.login(DISCORD_BOT_TOKEN);

// 6. معالجة التفاعل (أوامر السلاش والأزرار)
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`لم يتم العثور على أمر سلاش يطابق ${interaction.commandName}.`);
            return;
        }

        // هذا الجزء هو فحص صلاحية المسؤول لأوامر السلاش
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({
                content: 'عذراً، أنت لا تملك صلاحية **المسؤول** لاستخدام هذا الأمر.',
                ephemeral: true
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('حدث خطأ أثناء تنفيذ أمر السلاش:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: 'عذراً، حدث خطأ أثناء تنفيذ هذا الأمر. يرجى المحاولة مرة أخرى لاحقاً.',
                    ephemeral: true
                }).catch(e => console.error('فشل في تحرير الرد الأولي بعد الخطأ:', e));
            } else {
                await interaction.reply({
                    content: 'عذراً، حدث خطأ أثناء تنفيذ هذا الأمر. يرجى المحاولة مرة أخرى لاحقاً.',
                    ephemeral: true
                }).catch(e => console.error('فشل في الرد على التفاعل بعد الخطأ:', e));
            }
        }
    } else if (interaction.isButton()) {
        // تم حذف فحص صلاحية المسؤول هنا للسماح للجميع باستخدام الأزرار

        if (interaction.customId.startsWith('xo_')) {
            const xoGame = client.prefixCommands.get('xo');
            if (xoGame && xoGame.handleButtonInteraction) {
                await xoGame.handleButtonInteraction(interaction);
            } else {
                console.warn('لم يتم العثور على معالج زر لـ XO أو أنه غير معرف. Custom ID:', interaction.customId);
                await interaction.reply({ content: 'لا يمكن معالجة هذا التفاعل حالياً.', ephemeral: true }).catch(e => console.error('فشل في الرد على تفاعل الزر:', e));
            }
        }
        
        // معالجة الأزرار الخاصة بأمر !info
        if (interaction.customId === 'server_info') {
            await interaction.reply({
                content: 'هنا يأتي شرح السيرفر...',
                ephemeral: true
            });
        } else if (interaction.customId === 'about_sop') {
            await interaction.reply({
                content: 'هذه معلومات إضافية عن SOP...',
                ephemeral: true
            });
        }
    }
});

// 7. معالجة الرسائل (الأوامر النصية ودمج Hugging Face AI)
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // تم حذف فحص صلاحية المسؤول من هنا

    const prefix = process.env.PREFIX || '-';
    const botMention = new RegExp(`^<@!?${client.user.id}>`);
    let userPrompt = '';
    let isAITriggered = false;

    // 🟢 إضافة أمر !info هنا
    if (message.content === '!info') {
        const infoEmbed = new EmbedBuilder()
            .setColor('#7c62ee')
            .setTitle('معلومات سيرفر SOP')
            .setDescription('يمكنك معرفة كل ما يخص السيرفر عن طريق ضغط الأزرار التي بالأسفل')
            .setAuthor({
                name: 'SOP-Bot-System',
                iconURL: 'https://i.imgur.com/your_bot_profile_image.png',
            })
            .setThumbnail('https://i.imgur.com/bKj1T6R.png')
            .setImage('https://i.imgur.com/qLzRk13.png');

        const serverInfoButton = new ButtonBuilder()
            .setCustomId('server_info')
            .setLabel('شرح السيرفر')
            .setStyle(ButtonStyle.Blurple)
            .setEmoji('📖');

        const aboutSopButton = new ButtonBuilder()
            .setCustomId('about_sop')
            .setLabel('about sop')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🙂');

        const row = new ActionRowBuilder().addComponents(serverInfoButton, aboutSopButton);

        await message.channel.send({
            embeds: [infoEmbed],
            components: [row],
        });
        return; // مهم جداً لإيقاف الكود هنا
    }
    
    // الأوامر النصية الأخرى
    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.prefixCommands.get(commandName);

        if (!command) {
            if (client.hfInferenceClient && (commandName === 'hf' || commandName === 'ai' || commandName === 'ask')) {
                userPrompt = args.join(' ');
                isAITriggered = true;
                if (!userPrompt) {
                    return message.reply('من فضلك، اطرح سؤالاً بعد `' + prefix + commandName + '`.');
                }
            } else {
                return;
            }
        } else {
            try {
                await command.execute(message, args);
            } catch (error) {
                console.error(`حدث خطأ أثناء تنفيذ الأمر النصي "${commandName}":`, error);
                await message.reply('عذراً، حدث خطأ أثناء تنفيذ هذا الأمر.');
            }
            return;
        }

    } else if (botMention.test(message.content)) {
        if (client.hfInferenceClient) {
            userPrompt = message.content.replace(botMention, '').trim();
            isAITriggered = true;
            if (!userPrompt) {
                return message.reply('كيف يمكنني مساعدتك؟ اطرح سؤالك بعد المنشن.');
            }
        } else {
            return message.reply('مرحباً! أنا جاهز للمساعدة، لكن وظائف الذكاء الاصطناعي غير متوفرة حالياً.');
        }

    } else if (message.reference && message.reference.messageId) {
        try {
            const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedToMessage.author.id === client.user.id) {
                if (client.hfInferenceClient) {
                    userPrompt = message.content.trim();
                    isAITriggered = true;
                    if (!userPrompt) {
                        return message.reply('من فضلك، اكتب سؤالك أو تعليقك بعد الرد على رسالتي.');
                    }
                } else {
                    return message.reply('مرحباً! أنا جاهز للمساعدة، لكن وظائف الذكاء الاصطناعي غير متوفرة حالياً.');
                }
            }
        } catch (error) {
            console.error("❌ حدث خطأ عند جلب الرسالة التي تم الرد عليها:", error);
        }
    }

    if (!isAITriggered) {
        return;
    }

    if (userPrompt) {
        message.channel.sendTyping();

        try {
            const chatCompletion = await client.hfInferenceClient.chatCompletion({
                provider: HF_CHAT_PROVIDER,
                model: HF_CHAT_MODEL,
                messages: [{ role: "user", content: userPrompt }],
            });

            if (chatCompletion && chatCompletion.choices && chatCompletion.choices[0] && chatCompletion.choices[0].message) {
                message.reply({ content: chatCompletion.choices[0].message.content });
            } else {
                message.reply('عذراً، لم أتلق ردًا مفهومًا من نموذج Hugging Face.');
            }

        } catch (error) {
            console.error('❌ خطأ في استدعاء Hugging Face AI:', error);
            message.reply('عذراً، حدث خطأ أثناء التواصل مع Hugging Face AI. الرجاء المحاولة لاحقاً.');
        }
    }
});