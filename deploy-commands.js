const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { clientId, guildId, token } = require('./config.json'); // استيراد البيانات من config.json

const commands = [];
// جلب جميع ملفات الأوامر من مجلدات الأوامر
const foldersPath = path.join(__dirname, 'slash', 'commands'); // مسار مجلد أوامر السلاش
const commandFolders = fs.readdirSync(foldersPath); // قراءة المجلدات الفرعية

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON()); // إضافة بيانات الأمر بصيغة JSON
        } else {
            console.warn(`[تحذير] الأمر في ${filePath} يفتقد خاصية 'data' أو 'execute' المطلوبة.`);
        }
    }
}

// بناء REST و Routes
const rest = new REST().setToken(token);

// تسجيل الأوامر
(async () => {
    try {
        console.log(`بدء تحديث ${commands.length} أوامر تطبيق (/).`);

        // يمكنك تسجيلها عالميًا (لجميع الخوادم) أو لخادم معين (للتطوير)
        // اختر أحد الخيارين:

        // 1. تسجيل عالمي (سيستغرق الأمر وقتًا ليظهر في جميع الخوادم)
        // const data = await rest.put(
        //     Routes.applicationCommands(clientId),
        //     { body: commands },
        // );

        // 2. تسجيل لخادم معين (أسرع للتطوير، يظهر فقط في الخادم المحدد بـ guildId)
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`تم إعادة تحميل ${data.length} أوامر تطبيق (/).`);
    } catch (error) {
        console.error(error);
    }
})();