// slash/commands/utility/role.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('إدارة أدوار الأعضاء.') // الوصف بالعربي
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles) // يتطلب صلاحية إدارة الأدوار
        // أمر فرعي: add
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('إعطاء دور لعضو.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('العضو المراد إعطائه الدور.')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الدور المراد إعطائه.')
                        .setRequired(true)))
        // أمر فرعي: remove
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إزالة دور من عضو.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('العضو المراد إزالة الدور منه.')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الدور المراد إزالته.')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetMember = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!targetMember) {
            return interaction.reply({ content: 'لم أتمكن من العثور على هذا المستخدم في السيرفر.', ephemeral: true });
        }
        if (!role) {
            return interaction.reply({ content: 'لم يتم العثور على هذا الدور.', ephemeral: true });
        }

        // التحقق من صلاحيات البوت (أن يكون دور البوت أعلى من الدور المستهدف)
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: `لا يمكنني إضافة/إزالة الدور "${role.name}" لأن رتبتي أقل من أو تساوي رتبة هذا الدور.`, ephemeral: true });
        }
        // التحقق من صلاحيات المستخدم الذي أصدر الأمر (أن يكون دوره أعلى من الدور المستهدف)
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: `لا يمكنك إضافة/إزالة الدور "${role.name}" لأن رتبتك أقل من أو تساوي رتبة هذا الدور.`, ephemeral: true });
        }
        // لا يمكن إضافة/إزالة أدوار المسؤولين (Admin) إلا لمالك السيرفر
        if (role.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: `لا يمكنك إدارة أدوار المسؤولين إلا إذا كنت مالك السيرفر.`, ephemeral: true });
        }

        if (subcommand === 'add') {
            if (targetMember.roles.cache.has(role.id)) {
                return interaction.reply({ content: `العضو ${targetMember.user.tag} لديه بالفعل الدور ${role.name}.`, ephemeral: true });
            }
            try {
                await targetMember.roles.add(role);
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00) // أخضر للنجاح
                    .setDescription(`✅ تم إعطاء الدور ${role.name} للعضو ${targetMember.user.tag}.`)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('خطأ في إضافة الدور:', error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إعطاء الدور.', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            if (!targetMember.roles.cache.has(role.id)) {
                return interaction.reply({ content: `العضو ${targetMember.user.tag} ليس لديه الدور ${role.name}.`, ephemeral: true });
            }
            try {
                await targetMember.roles.remove(role);
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // أحمر للإزالة
                    .setDescription(`❌ تم إزالة الدور ${role.name} من العضو ${targetMember.user.tag}.`)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('خطأ في إزالة الدور:', error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إزالة الدور.', ephemeral: true });
            }
        }
    },
};