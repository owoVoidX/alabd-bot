// slash/commands/admin/say.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js'); // تأكد من استيراد PermissionsBitField


module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('اجعل البوت يقول رسالة معينة.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // <--- هذا هو السطر المهم
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة التي تريد أن يقولها البوت.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const messageToSay = interaction.options.getString('message');
        await interaction.reply({ content: 'تم إرسال رسالتك بواسطة البوت!', ephemeral: true });
        await interaction.channel.send(messageToSay);
    },
};