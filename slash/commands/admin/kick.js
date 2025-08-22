const { SlashCommandBuilder, PermissionsBitField } = require('discord.js'); // نضيف PermissionsBitField

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('يطرد مستخدماً من الخادم')
        .addUserOption(option => // هذا الخيار لتحديد المستخدم الذي سيتم طرده
            option.setName('user')
                .setDescription('المستخدم الذي تريد طرده')
                .setRequired(true) // هذا الخيار إلزامي
        )
        .addStringOption(option => // هذا الخيار لسبب الطرد
            option.setName('reason')
                .setDescription('السبب وراء الطرد')
                .setRequired(false) // هذا الخيار اختياري
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers), // يتطلب إذن طرد الأعضاء لاستخدام الأمر

    async execute(interaction) {
        // التحقق من صلاحيات البوت والمستخدم (مهم جداً لأوامر الإدارة)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: 'ليس لديك صلاحية استخدام هذا الأمر!', ephemeral: true });
        }
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: 'البوت ليس لديه صلاحية طرد الأعضاء!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user'); // الحصول على كائن المستخدم المستهدف
        const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب.'; // الحصول على السبب أو سبب افتراضي

        // التأكد أن المستخدم المستهدف موجود في الخادم
        const member = interaction.guild.members.cache.get(targetUser.id);
        if (!member) {
            return interaction.reply({ content: 'لا يمكن العثور على هذا المستخدم في الخادم.', ephemeral: true });
        }

        // التأكد من عدم محاولة البوت طرد نفسه أو شخص لديه صلاحيات أعلى
        if (member.id === interaction.client.user.id) {
            return interaction.reply({ content: 'لا يمكنني طرد نفسي!', ephemeral: true });
        }
        if (member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
             return interaction.reply({ content: 'لا يمكنك طرد مسؤول!', ephemeral: true });
        }
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: 'لا يمكنك طرد مستخدم لديه دور أعلى أو مساوٍ لدورك!', ephemeral: true });
        }
        if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'لا يمكنني طرد مستخدم لديه دور أعلى أو مساوٍ لدوري!', ephemeral: true });
        }

        try {
            await member.kick(reason); // تنفيذ عملية الطرد
            await interaction.reply({ content: `${targetUser.tag} تم طرده من الخادم. السبب: ${reason}`, ephemeral: false }); // رد مرئي للجميع
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `حدث خطأ أثناء محاولة طرد ${targetUser.tag}.`, ephemeral: true });
        }
    },
};