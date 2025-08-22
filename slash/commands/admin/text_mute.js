// slash/commands/moderation/text_mute.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('text_mute') // تم التغيير هنا
        .setDescription('يتحكم في كتم/إلغاء كتم كتابة الأعضاء.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers) // يتطلب صلاحية تعديل الأعضاء للتحكم في المهلة
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('كتم عضو من الكتابة (إضافة مهلة).')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد كتمه نصياً.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('مدة الكتم بالدقائق (1-40320).') // 28 يوم = 40320 دقيقة
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء الكتم النصي.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إلغاء كتم عضو من الكتابة (إزالة مهلة).')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد إلغاء كتمه نصياً.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء إلغاء الكتم النصي.')
                        .setRequired(false))),
    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const subcommand = interaction.options.getSubcommand();
        const reason = interaction.options.getString('reason') || 'لا يوجد سبب محدد.';

        if (!target) {
            return interaction.reply({ content: 'لم يتم العثور على هذا العضو.', ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'لا يمكنك تنفيذ هذا الأمر على نفسك!', ephemeral: true });
        }

        // هذه الشروط تعتمد على صلاحيات الأدوار في السيرفر الحالي وهي صحيحة
        if (target.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
             return interaction.reply({ content: 'لا يمكنك كتم/إلغاء كتم مسؤول، إلا إذا كنت مالك الخادم!', ephemeral: true });
        }
        
        // التحقق من أن البوت لديه صلاحيات أعلى من العضو المستهدف
        if (target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'لا يمكنني تنفيذ هذا الأمر على هذا العضو لأنه يمتلك رتبة أعلى مني أو مساوية لرتبتي.', ephemeral: true });
        }


        if (subcommand === 'add') {
            const duration = interaction.options.getInteger('duration');
            const durationMs = duration * 60 * 1000; // تحويل الدقائق إلى مللي ثانية

            if (duration <= 0) {
                return interaction.reply({ content: 'يجب أن تكون المدة أكبر من 0 دقيقة.', ephemeral: true });
            }
            // الحد الأقصى لـ timeout هو 28 يومًا (40320 دقيقة)
            if (duration > 40320) {
                return interaction.reply({ content: 'لا يمكن كتم عضو نصياً لأكثر من 28 يومًا (40320 دقيقة).', ephemeral: true });
            }
            if (target.isCommunicationDisabled()) {
                return interaction.reply({ content: `${target.user.tag} مكتوم نصياً بالفعل (لديه مهلة).`, ephemeral: true });
            }

            try {
                await target.timeout(durationMs, reason);
                await interaction.reply({ content: `تم كتم ${target.user.tag} نصياً لمدة ${duration} دقيقة بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة كتم العضو نصياً. تأكد أن البوت لديه صلاحية "تعديل الأعضاء".', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            if (!target.isCommunicationDisabled()) { // التحقق إذا كان العضو عليه مهلة بالفعل
                return interaction.reply({ content: `${target.user.tag} ليس مكتوماً نصياً حالياً.`, ephemeral: true });
            }

            try {
                await target.timeout(null, reason); // إزالة المهلة (timeout: null)
                await interaction.reply({ content: `تم إلغاء كتم ${target.user.tag} نصياً بنجاح بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إلغاء كتم العضو نصياً. تأكد أن البوت لديه صلاحية "تعديل الأعضاء".', ephemeral: true });
            }
        }
    },
};