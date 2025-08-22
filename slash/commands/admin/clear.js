// slash/commands/moderation/clear.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('يمسح عدداً محدداً من الرسائل من القناة.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages) // يتطلب صلاحية إدارة الرسائل
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل المراد مسحها (1-99).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 99) {
            return interaction.reply({ content: 'يجب أن يكون العدد بين 1 و 99.', ephemeral: true });
        }

        try {
            await interaction.channel.bulkDelete(amount, true); // true لتجاهل الرسائل القديمة (أكثر من 14 يومًا)
            await interaction.reply({ content: `تم مسح ${amount} رسالة بنجاح.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'حدث خطأ أثناء محاولة مسح الرسائل. تأكد من أن البوت لديه صلاحية "إدارة الرسائل".', ephemeral: true });
        }
    },
};