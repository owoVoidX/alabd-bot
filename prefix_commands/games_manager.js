// prefix_commands/games_manager.js

const { EmbedBuilder } = require('discord.js');

module.exports = {
    commands: [
        {
            name: 'العاب', // الأمر الوحيد في هذا الملف
            description: 'يعرض قائمة بجميع الألعاب المتاحة.',
            usage: 'العاب',
            aliases: ['games', 'games-list', 'قائمة-الالعاب'],
            async execute(message, args) {
                const prefix = process.env.PREFIX || '-'; // تأكد من استخدام البادئة الصحيحة

                // بناء السلاسل النصية لأقسام الألعاب كما طلبت
                const serverGamesText = `**ألعاب السيرفر**
${prefix}روليت
${prefix}xo
${prefix}مافيا
${prefix}كراسي
${prefix}حجرة
${prefix}نرد
${prefix}عجلة
${prefix}hotxo
${prefix}غميضة
${prefix}ريبلكا`;

                const soloGamesText = `**ألعاب فردية**
${prefix}زر
${prefix}اسرع
${prefix}فكك
${prefix}ادمج
${prefix}اعلام
${prefix}اعكس
${prefix}حرف
${prefix}صحح
${prefix}ترتيب
${prefix}الوان
${prefix}ايموجي`;

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF) // يمكنك تغيير اللون
                    .setTitle('                       🎮 قائمة الألعاب 🎮') // تمت إضافة مسافات لمحاولة توسيط العنوان
                    .setDescription(`${serverGamesText}\n\n${soloGamesText}`)
                    .setTimestamp()
                    .setFooter({ text: `طلب بواسطة ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

                await message.reply({ embeds: [embed] });
            },
        },
    ],
};