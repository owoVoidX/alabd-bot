const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// هذا السطر يقوم بتحميل المتغيرات من ملف .env
require('dotenv').config();

// قراءة توكن البوت من ملف .env
const discordToken = process.env.DISCORD_TOKEN;

// --- تهيئة Google Gemini API ---
const { GoogleGenerativeAI } = require('@google/generative-ai');

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = gemini.getGenerativeModel({ model: "gemini-1.5-flash" }); // تأكد أن هذا هو gemini-1.5-flash

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
    const commandsPathInFolder = path.join(foldersPath, folder); // يجب أن يكون المتغير مختلفاً لتجنب الالتباس
    const commandFiles = fs.readdirSync(commandsPathInFolder).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPathInFolder, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.warn(`[تحذير] الأمر في ${filePath} مفقود منه خاصية "data" أو "execute" المطلوبة.`);
            }
        } catch (error) {
            console.error(`خطأ أثناء تحميل الأمر من ${filePath}:`, error);
        }
    }
}

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
    if (message.author.bot) {
        console.log("الرسالة من بوت، تم تجاهلها.");
        return;
    }

    console.log("تم استدعاء معالج messageCreate.");
    console.log("نوع القناة:", message.channel.type);

    // للتأكد من أن البوت يرد فقط عندما يتم منشنته في السيرفرات (نوع القناة 0 يعني قناة نصية في السيرفر)
    if (message.channel.type === 0 && message.mentions.users.has(client.user.id)) {
        console.log("تلقيت منشن في سيرفر من:", message.author.tag, "المحتوى:", message.content);

        // --- الكود الجديد هنا للتحقق من صلاحية المسؤول ---
        // تأكد أن الرسالة جاءت من عضو في السيرفر (وليس من رسالة خاصة مثلاً)
        if (!message.member) {
            console.log("الرسالة ليست من عضو في سيرفر (DM)، لا يمكن التحقق من الصلاحيات. تم تجاهلها.");
            return;
        }

        // التحقق مما إذا كان العضو لديه صلاحية المسؤول (Administrator)
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`المستخدم ${message.author.tag} حاول استخدام الذكاء الاصطناعي لكنه لا يملك صلاحية المسؤول.`);
            // يمكنك هنا إضافة رد قصير للمستخدم يخبره بأنه لا يملك الصلاحية،
            // مثال: await message.reply("عذراً، أنت لا تملك الصلاحيات اللازمة لاستخدام الذكاء الاصطناعي.");
            // لكن بما أنك طلبت "ما يكتب شيء"، فسنكتفي بالـ return.
            return; // إيقاف التنفيذ إذا لم يكن لديه الصلاحية
        }
        // --- نهاية الكود الجديد ---

        const prompt = message.content.replace(`<@${client.user.id}>`, '').trim();

        if (!prompt) {
            await message.reply(`مرحباً ${message.author.username}! كيف يمكنني مساعدتك؟ اذكرني بسؤالك بعد المنشن.`);
            return;
        }

        try {
            await message.channel.sendTyping(); // يظهر أن البوت يكتب

            // إرسال الطلب إلى Google Gemini API
            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            let aiResponse = "عذراً، لم أستطع الحصول على رد مفهوم من الذكاء الاصطناعي من Gemini.";
            if (text) {
                aiResponse = text;
            } else {
                console.log("استجابة غير متوقعة من Gemini:", response);
            }

            // لضمان أن الرد لا يتجاوز الحد الأقصى لرسائل ديسكورد (2000 حرف)
            if (aiResponse.length > 2000) {
                aiResponse = aiResponse.substring(0, 1997) + "...";
            }

            await message.reply(aiResponse);

        } catch (error) {
            console.error('حدث خطأ أثناء الاتصال بـ Gemini API:', error);
            let userErrorMessage = 'عذراً، حدث خطأ أثناء معالجة طلبك مع الذكاء الاصطناعي من Gemini. يرجى المحاولة لاحقاً.';
            await message.reply(userErrorMessage);
        }
    } else if (message.channel.type === 1) { // نوع القناة 1 يعني رسالة خاصة (DM)
        console.log("تلقيت رسالة خاصة في DM. تم تجاهلها.");
        // يمكنك هنا اختيار ما إذا كنت تريد أن يرد البوت في الرسائل الخاصة أم لا
        // await message.reply("أنا بوت ديسكورد، يرجى منشنني في سيرفر لكي أرد عليك.");
    } else {
        // رسائل في السيرفر لم يتم منشن البوت فيها
        console.log("رسالة في السيرفر لم يتم منشني فيها. القناة ID:", message.channel.id);
    }
});

// ====== حدث جاهزية البوت (عند الاتصال) ======
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} جاهز للعمل!`);
});

// ====== تسجيل دخول البوت ======
client.login(discordToken);