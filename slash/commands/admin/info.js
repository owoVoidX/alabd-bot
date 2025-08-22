// slash/commands/admin/info.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
    // 1. بناء أمر السلاش
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('يرسل الإيمبد الترحيبي مع أزرار المعلومات.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // 2. دالة التنفيذ
    async execute(interaction) {
        // تأجيل الرد أولاً لإعطاء البوت وقتاً أطول لمعالجة الأمر
        await interaction.deferReply({ ephemeral: false });

        // إنشاء رسالة الإيمبد
        const infoEmbed = new EmbedBuilder()
            .setColor('#0095ff')
            .setTitle('مساعدة تلقائية')
            .setDescription('يمكنك معرفة كل ما يخص جيزمو و السيرفر في الأسفل ⬇️')
            .setAuthor({
                name: 'البدء في السيرفر',
                iconURL: 'https://img.itch.zone/aW1nLzIyODQwNTExLnBuZw==/original/txIqGm.png',
            })
            .setThumbnail('https://img.itch.zone/aW1nLzIyODQwNTExLnBuZw==/original/txIqGm.png')
            .setImage('https://img.itch.zone/aW1nLzIyODQwNTExLnBuZw==/original/txIqGm.png');

        // إنشاء الأزرار باستخدام الأرقام
        const serverInfoButton = new ButtonBuilder()
            .setCustomId('server_info')
            .setLabel('شرح السيرفر')
            .setStyle(1) // 1 تعني ButtonStyle.Blurple
            .setEmoji('📖');

        const aboutSopButton = new ButtonBuilder()
            .setCustomId('about_gizmo')
            .setLabel('عن جيزمو')
            .setStyle(2) // 2 تعني ButtonStyle.Secondary
            .setEmoji('👾');

        // تجميع الأزرار
        const row = new ActionRowBuilder().addComponents(serverInfoButton, aboutSopButton);

        // استخدام followUp لإرسال الرد الفعلي بعد التأجيل
        await interaction.followUp({
            embeds: [infoEmbed],
            components: [row]
        });
    },
};