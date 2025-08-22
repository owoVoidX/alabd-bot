// deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config(); // تأكد من تحميل .env

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'slash', 'commands'); // هذا المسار صحيح لأوامر السلاش
let commandFolders = [];
try {
    commandFolders = fs.readdirSync(foldersPath);
} catch (error) {
    console.warn(`[تحذير] مجلد أوامر السلاش "${foldersPath}" غير موجود أو لا يمكن قراءته. لن يتم نشر أوامر سلاش.`, error.message);
    commandFolders = []; // تأكد من أنها مصفوفة فارغة لتجنب الأخطاء لاحقاً
}


for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    // تأكد أن ما نقوم بقرائته هو مجلد فعلاً
    if (!fs.lstatSync(commandsPath).isDirectory()) {
        console.log(`[تحذير] تم العثور على ملف غير مجلد في ${commandsPath}. تم تخطيه.`);
        continue; // تخطى إذا لم يكن مجلداً
    }
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[تحذير] الأمر في ${filePath} مفقود منه خاصية "data" أو "execute" المطلوبة.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy your commands!
(async () => {
    try {
        console.log(`بدأ تحديث ${commands.length} أمر (أوامر) تطبيق (سلاش).`);

        // The put method is used to fully refresh all commands in the guild with the current set
        // يمكنك استخدام Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) لنشرها في سيرفر معين للاختبار
        // أو Routes.applicationCommands(CLIENT_ID) لنشرها عامة (قد يستغرق وقتاً)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), // لنشر الأوامر عامة
            { body: commands },
        );

        console.log(`تم إعادة تحميل ${data.length} أمر (أوامر) تطبيق (سلاش) بنجاح.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error('فشل في نشر أوامر السلاش:', error);
    }
})();