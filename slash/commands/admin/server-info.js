// slash/commands/utility/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('يعرض معلومات حول الخادم.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator), // <--- هذا السطر تم تفعيله ليراه المسؤولون فقط

    async execute(interaction) {
        const guild = interaction.guild; // كائن الخادم الحالي

        // جلب المالك (owner) بشكل صحيح
        let ownerTag = 'غير معروف';
        try {
            const owner = await guild.fetchOwner();
            ownerTag = owner.user.tag; // اسم المالك مع التاج
        } catch (error) {
            console.error("حدث خطأ أثناء جلب مالك الخادم:", error);
            ownerTag = "غير معروف (خطأ في الجلب)";
        }

        // تنسيق تاريخ الإنشاء
        // تأكد من أن البوت لديه صلاحية "VIEW_CHANNEL" لرؤية القناة التي تم فيها الأمر
        // وأيضًا صلاحية "READ_MESSAGE_HISTORY" إذا كانت القناة مؤرشفة أو مقيدة
        const creationDate = guild.createdAt.toLocaleDateString('ar-EG', { // 'ar-EG' لتنسيق عربي
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // إنشاء Embed
        const serverInfoEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // لون Embed (يمكنك تغييره)
            .setTitle(' معلومات الخادم :') // العنوان الرئيسي
            .addFields(
                { name: 'الإسم', value: `${guild.name}`, inline: false },
                { name: 'عدد الأعضاء', value: `${guild.memberCount}`, inline: false },
                { name: 'تاريخ الإنشاء', value: `${creationDate}`, inline: false },
                { name: 'المالك :crown:', value: `${ownerTag}`, inline: false } // أيقونة التاج
            )
            .setThumbnail(guild.iconURL({ dynamic: true })) // صورة أيقونة الخادم
            .setTimestamp() // يضيف طابع زمني في الأسفل
            .setFooter({ text: `معرف الخادم (ID): ${guild.id}` }); // إضافة ID الخادم في التذييل ليكون مفيداً

        await interaction.reply({ embeds: [serverInfoEmbed], ephemeral: false });
    },
};