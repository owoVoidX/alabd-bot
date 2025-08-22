// slash/commands/moderation/voice_mute.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice_mute') // تم التغيير هنا
        .setDescription('يتحكم في كتم/إلغاء كتم صوت الأعضاء في القنوات الصوتية.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.MuteMembers) // يتطلب صلاحية كتم الأعضاء في الصوت
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('كتم صوت عضو في القناة الصوتية.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد كتم صوته.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء كتم الصوت.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إلغاء كتم صوت عضو في القناة الصوتية.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('العضو الذي تريد إلغاء كتم صوته.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('السبب وراء إلغاء كتم الصوت.')
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

        // يجب أن يكون المستخدم في قناة صوتية لتطبيق كتم الصوت
        if (!target.voice.channel) {
            return interaction.reply({ content: `${target.user.tag} ليس في قناة صوتية.`, ephemeral: true });
        }


        if (subcommand === 'add') {
            if (target.voice.mute) {
                return interaction.reply({ content: `${target.user.tag} مكتوم الصوت بالفعل.`, ephemeral: true });
            }
            try {
                await target.voice.setMute(true, reason); // كتم صوت المستخدم
                await interaction.reply({ content: `تم كتم صوت ${target.user.tag} في القناة الصوتية بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة كتم صوت العضو. تأكد أن البوت لديه صلاحية "كتم الأعضاء".', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            if (!target.voice.mute) {
                return interaction.reply({ content: `${target.user.tag} ليس مكتوم الصوت حالياً.`, ephemeral: true });
            }
            try {
                await target.voice.setMute(false, reason); // إلغاء كتم صوت المستخدم
                await interaction.reply({ content: `تم إلغاء كتم صوت ${target.user.tag} في القناة الصوتية بنجاح بسبب: ${reason}`, ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء محاولة إلغاء كتم صوت العضو. تأكد أن البوت لديه صلاحية "كتم الأعضاء".', ephemeral: true });
            }
        }
    },
};