// slash/commands/moderation/timeout.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('يتحكم في المهلة (timeout) للأعضاء.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('إضافة مهلة لمستخدم.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد إضافة المهلة له.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('مدة المهلة (رقم).')
                        .setRequired(true))
                .addStringOption(option => // إضافة خيار الوحدة الزمنية
                    option.setName('unit')
                        .setDescription('وحدة المدة (ثانية، دقيقة، ساعة).')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ثواني', value: 'seconds' },
                            { name: 'دقائق', value: 'minutes' },
                            { name: 'ساعات', value: 'hours' }
                        ))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء إضافة المهلة.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إزالة مهلة من مستخدم.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد إزالة المهلة عنه.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء إزالة المهلة.')
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
             return interaction.reply({ content: 'لا يمكنك إضافة/إزالة مهلة لمسؤول، إلا إذا كنت مالك الخادم!', ephemeral: true });
        }
        
        // التحقق من أن البوت لديه صلاحيات أعلى من العضو المستهدف
        if (target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: 'لا يمكنني إضافة/إزالة مهلة لهذا العضو لأنه يمتلك رتبة أعلى مني أو مساوية لرتبتي.', ephemeral: true });
        }

        if (subcommand === 'add') {
            const duration = interaction.options.getInteger('duration');
            const unit = interaction.options.getString('unit'); // الحصول على الوحدة الزمنية

            let durationMs;
            let durationText; // نص لعرض المدة والوحدة في الرد

            switch (unit) {
                case 'seconds':
                    durationMs = duration * 1000;
                    durationText = `${duration} ثانية`;
                    break;
                case 'minutes':
                    durationMs = duration * 60 * 1000;
                    durationText = `${duration} دقيقة`;
                    break;
                case 'hours':
                    durationMs = duration * 60 * 60 * 1000;
                    durationText = `${duration} ساعة`;
                    break;
                default:
                    return interaction.reply({ content: 'وحدة زمنية غير صالحة. يرجى استخدام "ثواني" أو "دقائق" أو "ساعات".', ephemeral: true });
            }

            // الحد الأقصى لـ timeout هو 28 يومًا (2419200000 مللي ثانية)
            const maxDurationMs = 2419200000;

            if (duration <= 0) {
                return interaction.reply({ content: 'يجب أن تكون المدة أكبر من 0.', ephemeral: true });
            }
            if (durationMs > maxDurationMs) {
                return interaction.reply({ content: `لا يمكن إضافة مهلة لأكثر من 28 يومًا ( ${Math.floor(maxDurationMs / (1000 * 60 * 60 * 24))} يوم).`, ephemeral: true });
            }
            if (target.isCommunicationDisabled()) {
                return interaction.reply({ content: `${target.user.tag} لديه مهلة حاليًا بالفعل.`, ephemeral: true });
            }

            try {
                await target.timeout(durationMs, reason);
                await interaction.reply({ content: `تم إضافة مهلة لـ ${target.user.tag} لمدة ${durationText} بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إضافة المهلة للعضو. تأكد أن البوت لديه صلاحية "تعديل الأعضاء".', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            if (!target.isCommunicationDisabled()) {
                return interaction.reply({ content: `${target.user.tag} ليس لديه مهلة حاليًا.`, ephemeral: true });
            }

            try {
                await target.timeout(null, reason);
                await interaction.reply({ content: `تم إزالة المهلة عن ${target.user.tag} بنجاح بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إزالة المهلة عن العضو. تأكد أن البوت لديه صلاحية "تعديل الأعضاء".', ephemeral: true });
            }
        }
    },
};