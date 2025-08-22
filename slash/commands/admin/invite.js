// slash/commands/invite.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    // بناء بيانات أمر السلاش
    data: new SlashCommandBuilder()
        .setName('invite') // اسم الأمر الذي سيظهر في ديسكورد (يجب أن يكون بأحرف صغيرة)
        .setDescription('يعرض رابط دعوة البوت لدعوتي إلى سيرفرك.'), // وصف الأمر

    // الدالة التي سيتم تنفيذها عند استخدام الأمر
    async execute(interaction) {
        // يمكنك الحصول على ID البوت من client.user.id
        const botId = interaction.client.user.id;
        const botUsername = interaction.client.user.username;
        // الحصول على صورة البوت الرمزية، والتأكد من أنها بتنسيق URL صحيح
        const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 });

        // قم بإنشاء رابط الدعوة. استخدم هنا صلاحيات 'applications.commands' و 'bot'.
        // الصلاحيات الرقمية (permissions) يمكن تعديلها حسب ما يحتاجه بوتك فعلاً.
        // 8 هو قيمة صلاحية Administrator (مسؤول). إذا كنت تريد أقل، استخدم القيمة المناسبة.
        // يمكنك استخدام حاسبة صلاحيات ديسكورد للمساعدة: https://discordapi.com/permissions.html
        // مثال على صلاحيات أقل شيوعاً: 274877918208 (قراءة، إرسال، تضمين روابط، إرفاق ملفات، إلخ.)
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`;

        // إنشاء رسالة Embed
        const inviteEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // لون الشريط الجانبي للـ Embed (يمكنك تغيير هذا اللون: استخدم #RRGGBB أو رقم عشري)
            .setTitle(`دعوة ${botUsername} إلى سيرفرك!`) // عنوان الـ Embed
            .setURL(inviteLink) // يجعل العنوان قابلاً للنقر ويؤدي إلى رابط الدعوة
            .setDescription(`انقر على العنوان أعلاه أو على الزر أدناه لدعوة **${botUsername}** إلى سيرفرك واستخدام أوامره الرائعة!`) // وصف الـ Embed
            .addFields(
                { name: 'رابط الدعوة المباشر', value: `[اضغط هنا لدعوتي](${inviteLink})`, inline: false },
                { name: 'الصلاحيات المطلوبة', value: 'مسؤول (Administrator)\n\n**ملاحظة:** يرجى منح صلاحيات كافية لضمان عمل البوت بشكل صحيح.', inline: false } // يمكنك تغيير هذا الوصف إذا غيرت الصلاحيات
            )
            .setThumbnail(botAvatarURL) // تعيين صورة البوت الرمزية كصورة مصغرة
            .setFooter({ text: `تم الطلب بواسطة ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }) // تذييل الـ Embed يظهر من طلب الأمر
            .setTimestamp(); // إضافة ختم زمني لوقت إرسال الرسالة

        await interaction.reply({
            embeds: [inviteEmbed], // إرسال الـ Embed
            flags: MessageFlags.Ephemeral // تجعل الرسالة مرئية للمستخدم الذي استخدم الأمر فقط
        });
    },
};