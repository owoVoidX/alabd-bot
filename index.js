// استيراد المكتبات الأساسية
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config.json'); // لاستيراد التوكن من config.json

// ====== الخطوة 1: تهيئة العميل والمجموعات ======
const client = new Client({ intents: [GatewayIntentBits.Guilds] }); // GatewayIntentBits.Guilds ضروري لأوامر السلاش

// لتخزين أوامر السلاش
client.commands = new Collection();

// استيراد وحدة 'path' المدمجة في Node.js
const path = require('node:path');
// استيراد وحدة 'fs' المدمجة في Node.js
const fs = require('node:fs');

// ====== الخطوة 2: منطق معالجة الأوامر (تحميل أوامر السلاش) ======
const commandsPath = path.join(__dirname, 'slash', 'commands'); // مسار مجلد أوامر السلاش
const commandFolders = fs.readdirSync(commandsPath); // قراءة المجلدات الفرعية داخل 'commands'

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        // التحقق مما إذا كان الأمر يحتوي على الخصائص المطلوبة (data و execute)
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[تحذير] الأمر في ${filePath} يفتقد خاصية 'data' أو 'execute' المطلوبة.`);
        }
    }
}

// ====== الخطوة 3: معالجة الأحداث (الاستماع لتفاعلات السلاش كوماند) ======
client.on('interactionCreate', async interaction => {
    // التأكد من أن التفاعل هو أمر شرطة مائلة للدردشة
    if (!interaction.isChatInputCommand()) return;

    // جلب الأمر من مجموعة الأوامر باستخدام اسمه
    const command = client.commands.get(interaction.commandName);

    // إذا لم يتم العثور على الأمر
    if (!command) {
        console.error(`لم يتم العثور على أمر يطابق ${interaction.commandName}.`);
        return;
    }

    // محاولة تنفيذ الأمر والتعامل مع الأخطاء
    try {
        await command.execute(interaction, client); // تمرير client إذا كان الأمر يحتاجه (مثل أمر ping)
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ هذا الأمر!', ephemeral: true });
        }
    }
});

// ====== الخطوة 4: حدث جاهزية البوت (عند الاتصال) ======
client.once('ready', () => {
    console.log(`البوت جاهز! تسجيل الدخول باسم: ${client.user.tag}`);
});

// ====== الخطوة 5: تسجيل دخول البوت ======
client.login(token); // استخدام التوكن من config.json