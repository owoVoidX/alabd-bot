// استيراد المكتبات الأساسية
const { Client, GatewayIntentBits, Collection } = require('discord.js');
// استيراد وحدة 'path' المدمجة في Node.js
const path = require('node:path');
// استيراد وحدة 'fs' المدمجة في Node.js
const fs = require('node:fs');

// استيراد التوكن من Replit Secrets (بفرض أنك سميته TOKEN في Replit Secrets)
const token = process.env.TOKEN;

// تهيئة العميل (البوت) بالـ Intents المطلوبة
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // ضروري لأوامر السلاش وتلقي أحداث السيرفر
        GatewayIntentBits.GuildMessages,    // لتلقي أحداث الرسائل في السيرفرات (إذا احتجتها مستقبلاً)
        GatewayIntentBits.MessageContent,   // لتلقي محتوى الرسائل (ضروري جداً إذا كنت ترد على رسائل أو تقرأ محتواها)
    ],
});

// لتخزين أوامر السلاش (Collection)
client.commands = new Collection();

// ====== الخطوة 1: تحميل أوامر السلاش ======
const commandsPath = path.join(__dirname, 'slash', 'commands'); // مسار مجلد أوامر السلاش
// التحقق من وجود المجلد قبل قراءته
if (!fs.existsSync(commandsPath)) {
    console.error(`مجلد الأوامر غير موجود: ${commandsPath}`);
    // يمكنك هنا إنهاء العملية أو إرسال إشعار
    process.exit(1); // إنهاء البوت إذا لم يتم العثور على مجلد الأوامر
}

const commandFolders = fs.readdirSync(commandsPath); // قراءة المجلدات الفرعية داخل 'commands'

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            const command = require(filePath);
            // التحقق مما إذا كان الأمر يحتوي على الخصائص المطلوبة (data و execute)
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.warn(`[تحذير] الأمر في ${filePath} يفتقد خاصية 'data' أو 'execute' المطلوبة.`);
            }
        } catch (error) {
            console.error(`خطأ أثناء تحميل الأمر من ${filePath}:`, error);
        }
    }
}

// ====== الخطوة 2: حدث جاهزية البوت (عند الاتصال) ======
client.once('ready', () => {
    console.log(`البوت جاهز! تسجيل الدخول باسم: ${client.user.tag}`);
    // هنا يمكنك تسجيل أوامر السلاش مع Discord API
    // هذا الجزء تم نقله من الكود السابق الذي كان يقوم بالتسجيل
    // ستحتاج إلى إعادة تفعيل هذا إذا كنت تريد تسجيل الأوامر عند كل تشغيل
    // ولكن عادةً ما يتم تسجيل الأوامر مرة واحدة باستخدام سكربت deploy-commands.js منفصل
    // أو إذا كنت تريد تسجيل الأوامر عند كل تشغيل، يجب عليك تضمين REST و Routes هنا
});

// ====== الخطوة 3: معالجة تفاعلات السلاش كوماند ======
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

// ====== الخطوة 4: تسجيل دخول البوت ======
client.login(token); // هذا السطر يجب أن يكون في النهاية، وتأكد من عدم وجود أي أقواس مفتوحة قبله