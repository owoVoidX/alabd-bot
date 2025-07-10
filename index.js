const { Client, GatewayIntentBits, Collection, PermissionsBitField, ChannelType } = require('discord.js'); // إضافة ChannelType هنا

const fs = require('node:fs');
const path = require('node:path');

// هذا السطر يقوم بتحميل المتغيرات من ملف .env
require('dotenv').config();

// قراءة توكن البوت من ملف .env
const discordToken = process.env.DISCORD_TOKEN;

// --- تهيئة Hugging Face Inference Client ---
const { InferenceClient } = require("@huggingface/inference");

// قم بتهيئة العميل باستخدام التوكن من .env
const hf = new InferenceClient(process.env.HF_TOKEN);

// اسم النموذج الذي نريد استخدامه من Hugging Face
const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

// --- تهيئة عميل Discord (Client) ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- تحميل أوامر السلاش (اختياري) ---
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'slash', 'commands');
let commandFolders = [];
try {
    commandFolders = fs.readdirSync(foldersPath);
} catch (error) {
    console.warn(`[تحذير] مجلد الأوامر "${foldersPath}" غير موجود أو لا يمكن قراءته. قد لا تعمل أوامر السلاش.`);
}

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[تحذير] الأمر في ${filePath} مفقود منه خاصية "data" أو "execute" المطلوبة.`);
        }
    }
}

// --- معالجة أوامر السلاش (interactionCreate) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`لم يتم العثور على أمر يطابق ${interaction.commandName}.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true });
        }
    }
});


// --- معالجة الرسائل العادية (messageCreate) للذكاء الاصطناعي ---
client.on('messageCreate', async message => {
    // تجاهل رسائل البوتات
    if (message.author.bot) {
        console.log("الرسالة من بوت، تم تجاهلها.");
        return;
    }

    console.log("تم استدعاء معالج messageCreate.");

    // التحقق مما إذا كانت الرسالة في سيرفر (وليست قناة خاصة DM)
    // ومما إذا كانت تحتوي على منشن للبوت
    if (message.channel.type === ChannelType.GuildText && message.mentions.users.has(client.user.id)) {
        console.log("تلقيت منشن في سيرفر من:", message.author.tag, "المحتوى:", message.content);

        // **هنا هو التعديل الأساسي للتحقق من صلاحية المسؤول (Administrator)**
        // الحصول على عضو السيرفر (GuildMember) الذي أرسل الرسالة
        const member = message.guild.members.cache.get(message.author.id);

        // التحقق مما إذا كان العضو موجودًا ولديه صلاحية Administrator
        if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`المستخدم ${message.author.tag} حاول استخدام البوت ولكنه ليس مسؤولاً. تم التجاهل.`);
            // يمكنك هنا إرسال رسالة للمستخدم تعلمه بأنه لا يملك الصلاحية، أو تتجاهله تمامًا.
            // إذا أردت إرسال رسالة:
            // await message.reply("عذراً، فقط المشرفون يمكنهم استخدام الذكاء الاصطناعي الخاص بي في الوقت الحالي.");
            return; // تجاهل الرسالة إذا لم يكن المستخدم مشرفاً
        }

        const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();

        if (!prompt) {
            await message.reply(`مرحباً ${message.author.username}! كيف يمكنني مساعدتك؟ اذكرني بسؤالك بعد المنشن.`);
            return;
        }

        try {
            await message.channel.sendTyping();

            // إعداد الرسائل لتمريرها إلى hf.chatCompletion
            const messages = [
                { role: "user", content: prompt }
            ];

            // استدعاء chatCompletion باستخدام InferenceClient
            const chatCompletion = await hf.chatCompletion({
                model: HF_MODEL,
                messages: messages,
            });

            let aiResponse = "عذراً، لم أستطع الحصول على رد مفهوم من الذكاء الاصطناعي من Hugging Face.";

            if (chatCompletion.choices && chatCompletion.choices.length > 0 && chatCompletion.choices[0].message && chatCompletion.choices[0].message.content) {
                aiResponse = chatCompletion.choices[0].message.content.trim();

                // تنظيف الرد من أي تكرار للمدخلات أو علامات خاصة بالنموذج
                aiResponse = aiResponse.replace(/\[INST\].*?\[\/INST\]/g, '').trim();
                aiResponse = aiResponse.replace(/<\|user\|>.*?<\|assistant\|>/g, '').trim();

            } else {
                console.log("استجابة غير متوقعة من Hugging Face:", chatCompletion);
            }

            if (aiResponse.length > 2000) {
                aiResponse = aiResponse.substring(0, 1997) + "...";
            }

            await message.reply(aiResponse);

        } catch (error) {
            console.error('حدث خطأ أثناء الاتصال بـ Hugging Face API:', error);
            let userErrorMessage = 'عذراً، حدث خطأ أثناء معالجة طلبك مع الذكاء الاصطناعي من Hugging Face.';

            // التعامل مع الأخطاء من InferenceClient
            if (error.status) { // الأخطاء من HTTP
                if (error.status === 401) {
                    userErrorMessage = 'عذراً، يبدو أن مفتاح Hugging Face Token غير صالح. يرجى التحقق من ملف .env.';
                } else if (error.status === 503) {
                    userErrorMessage = 'عذراً، النموذج قيد التحميل على Hugging Face (503 Service Unavailable). يرجى المحاولة مرة أخرى بعد لحظات.';
                } else if (error.status === 400 && error.message.includes("Model not found")) {
                    userErrorMessage = `عذراً، النموذج "${HF_MODEL}" غير موجود أو غير متاح على Hugging Face Inference API.`;
                } else {
                    userErrorMessage = `عذراً، حدث خطأ من Hugging Face API: ${error.status} - ${error.message}`;
                }
            } else { // أخطاء أخرى
                userErrorMessage = `عذراً، حدث خطأ غير متوقع: ${error.message}`;
            }
            await message.reply(userErrorMessage);
        }
    } else if (message.channel.type === ChannelType.DM) { // تم تغيير 1 إلى ChannelType.DM
        console.log("تلقيت رسالة خاصة في DM، تم تجاهلها بناءً على طلبك.");
    } else {
        console.log("رسالة في السيرفر لم يتم منشني فيها. القناة ID:", message.channel.id);
    }
});

// --- عند جاهزية البوت ---
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} جاهز للعمل!`);
});

// --- تسجيل الدخول بالتوكن ---
client.login(discordToken); 