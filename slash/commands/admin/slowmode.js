// slash/commands/moderation/slowmode.js
const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('تعديل وضع التبطيء (slowmode) لقناة محددة.') // الوصف بالعربي
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels) // يتطلب صلاحية إدارة القنوات
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة التي تريد تغيير وضع التبطيء لها.')
                .addChannelTypes(ChannelType.GuildText) // هذا الأمر خاص بالقنوات النصية
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('مدة التبطيء بالثواني (0 لإلغاء التبطيء).') // هذا الخيار هو الذي يسمح لك بإدخال أي عدد ثواني
                .setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const duration = interaction.options.getInteger('duration'); // هنا يتم أخذ القيمة التي يحددها المستخدم

        if (duration < 0 || duration > 21600) { // الحد الأقصى 6 ساعات (21600 ثانية)
            return interaction.reply({ content: 'يجب أن تكون مدة التبطيء بين 0 و 21600 ثانية (6 ساعات).', ephemeral: true });
        }

        try {
            await channel.setRateLimitPerUser(duration); // هنا يتم تطبيق القيمة على القناة
            if (duration === 0) {
                await interaction.reply({ content: `تم إلغاء وضع التبطيء في القناة ${channel.name}.`, ephemeral: false });
            } else {
                await interaction.reply({ content: `تم تعيين وضع التبطيء في القناة ${channel.name} إلى ${duration} ثانية.`, ephemeral: false });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'حدث خطأ أثناء محاولة تعديل وضع التبطيء. يرجى التأكد من أن البوت لديه صلاحية "إدارة القنوات".', ephemeral: true }); // تم إكمال رسالة الخطأ
        }
    },
};