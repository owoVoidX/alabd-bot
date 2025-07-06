const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // بيانات الأمر تبقى كما هي
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('اجعل البوت يقول رسالة معينة.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة التي تريد أن يقولها البوت.')
                .setRequired(true)
        ),
    
    // دالة التنفيذ مع التعديل
    async execute(interaction) {
        const messageToSay = interaction.options.getString('message'); // الحصول على الرسالة من المستخدم

        // الخطوة 1: الرد برسالة تأكيد مؤقتة (ephemeral) مرئية لك فقط
        await interaction.reply({ content: 'تم إرسال رسالتك بواسطة البوت!', ephemeral: true });

        // الخطوة 2: إرسال الرسالة الفعلية إلى القناة ليراها الجميع
        await interaction.channel.send(messageToSay);
    },
};