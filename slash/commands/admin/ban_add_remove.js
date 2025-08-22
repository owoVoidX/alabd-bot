// ban.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('يقوم بإدارة حظر المستخدمين')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // صلاحية المسؤول
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('يحظر مستخدماً من الخادم')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('المستخدم الذي تريد حظره')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء الحظر')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('يزيل الحظر عن مستخدم')
                .addStringOption(option => // نستخدم String لأنك تحتاج ID أو اسم المستخدم المحظور
                    option.setName('user_id') // اسم الخيار: user_id
                        .setDescription('معرف المستخدم (ID) الذي تريد إزالة الحظر عنه')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء إزالة الحظر')
                        .setRequired(false))
        ),

    async execute(interaction) {
        // تحققات صلاحيات البوت والمستخدم
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'ليس لديك صلاحية استخدام هذا الأمر!', ephemeral: true });
        }
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: 'البوت ليس لديه صلاحية حظر الأعضاء!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب.';

        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const member = interaction.guild.members.cache.get(targetUser.id);

            if (!member) {
                return interaction.reply({ content: 'لا يمكن العثور على هذا المستخدم في الخادم.', ephemeral: true });
            }
            if (member.id === interaction.client.user.id) {
                return interaction.reply({ content: 'لا يمكنني حظر نفسي!', ephemeral: true });
            }
            if (member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                 return interaction.reply({ content: 'لا يمكنك حظر مسؤول!', ephemeral: true });
            }
            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'لا يمكنك حظر مستخدم لديه دور أعلى أو مساوٍ لدورك!', ephemeral: true });
            }
            if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ content: 'لا يمكنني حظر مستخدم لديه دور أعلى أو مساوٍ لدوري!', ephemeral: true });
            }

            try {
                await member.ban({ reason: reason }); // تنفيذ الحظر
                await interaction.reply({ content: `${targetUser.tag} تم حظره من الخادم. السبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `حدث خطأ أثناء محاولة حظر ${targetUser.tag}.`, ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            const userId = interaction.options.getString('user_id'); // الحصول على ID المستخدم المحظور
            try {
                // Fetch ban to check if user is actually banned
                const bans = await interaction.guild.bans.fetch();
                const bannedUser = bans.find(ban => ban.user.id === userId);

                if (!bannedUser) {
                    return interaction.reply({ content: `المستخدم بالمعرف ${userId} ليس محظوراً.`, ephemeral: true });
                }

                await interaction.guild.bans.remove(userId, reason); // إزالة الحظر
                await interaction.reply({ content: `${bannedUser.user.tag} تم إزالة الحظر عنه. السبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `حدث خطأ أثناء محاولة إزالة الحظر عن المستخدم بالمعرف ${userId}.`, ephemeral: true });
            }
        }
    },
};