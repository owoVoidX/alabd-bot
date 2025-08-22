// slash/commands/moderation/channel.js
const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel') // اسم الأمر الرئيسي هو /channel
        .setDescription('إدارة القنوات النصية والصوتية (قفل/فتح).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels) // يتطلب صلاحية إدارة القنوات لرؤية واستخدام الأمر
        .addSubcommand(subcommand => // الأمر الفرعي الأول: lock
            subcommand
                .setName('lock')
                .setDescription('يقفل قناة نصية أو صوتية.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة التي تريد قفلها.')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice) // يمكن اختيار قنوات نصية أو صوتية
                        .setRequired(true))
                .addStringOption(option => // إضافة خيار السبب
                    option.setName('reason')
                        .setDescription('سبب القفل.')
                        .setRequired(false)))
        .addSubcommand(subcommand => // الأمر الفرعي الثاني: unlock
            subcommand
                .setName('unlock')
                .setDescription('يفتح قناة نصية أو صوتية مقفلة.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة التي تريد فتحها.')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice) // يمكن اختيار قنوات نصية أو صوتية
                        .setRequired(true))
                .addStringOption(option => // إضافة خيار السبب
                    option.setName('reason')
                        .setDescription('سبب الفتح.')
                        .setRequired(false))),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel'); // القناة المختارة
        const subcommand = interaction.options.getSubcommand(); // الأمر الفرعي المستخدم (lock أو unlock)
        const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب.';

        const everyoneRole = interaction.guild.roles.cache.find(r => r.name === '@everyone');
        if (!everyoneRole) {
            return interaction.reply({ content: 'تعذر العثور على دور `@everyone` في هذا السيرفر.', ephemeral: true });
        }

        let embed;

        if (subcommand === 'lock') {
            try {
                if (channel.type === ChannelType.GuildText) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: false,                // منع إرسال الرسائل
                        AttachFiles: false,                 // منع إرسال الصور والملفات
                        CreatePublicThreads: false,         // منع إنشاء الثريدات العامة
                        CreatePrivateThreads: false,        // منع إنشاء الثريدات الخاصة
                        SendMessagesInThreads: false,       // منع التحدث في الثريدات
                        UseApplicationCommands: false       // منع استخدام أوامر التطبيقات (Slash Commands)
                    });
                    embed = new EmbedBuilder()
                        .setColor(0xFF0000) // أحمر للقفل
                        .setTitle(`🔒 تم قفل القناة النصية: #${channel.name}`)
                        .setDescription(`**تم قفل القناة بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}\n\n**الآن لا يمكن لأي عضو إرسال رسائل، صور/ملفات، إنشاء ثريدات، التحدث فيها، أو استخدام أوامر التطبيقات (البوتات).**`)
                        .setTimestamp();
                } else if (channel.type === ChannelType.GuildVoice) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        Speak: false,                       // للقنوات الصوتية: منع التحدث
                        UseApplicationCommands: false       // منع استخدام أوامر التطبيقات (Slash Commands) في القناة الصوتية أيضًا
                    });
                    embed = new EmbedBuilder()
                        .setColor(0xFF0000) // أحمر للقفل
                        .setTitle(`🔒 تم قفل القناة الصوتية: ${channel.name}`)
                        .setDescription(`**تم قفل القناة الصوتية بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}\n\n**الآن لا يمكن لأي عضو التحدث في هذه القناة أو استخدام أوامر التطبيقات.**`)
                        .setTimestamp();
                } else {
                    return interaction.reply({ content: 'يمكنني قفل القنوات النصية أو الصوتية فقط.', ephemeral: true });
                }

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('خطأ في قفل القناة:', error);
                await interaction.reply({ content: `حدث خطأ أثناء قفل القناة ${channel.name}. يرجى التأكد من أن البوت لديه صلاحية "إدارة القنوات" وأنه أعلى من القناة في قائمة الصلاحيات.`, ephemeral: true });
            }
        } else if (subcommand === 'unlock') {
            try {
                if (channel.type === ChannelType.GuildText) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: null,                 // إزالة إعداد المنع
                        AttachFiles: null,                  // إزالة إعداد منع إرسال الصور والملفات
                        CreatePublicThreads: null,
                        CreatePrivateThreads: null,
                        SendMessagesInThreads: null,
                        UseApplicationCommands: null        // إزالة إعداد منع استخدام أوامر التطبيقات
                    });
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00) // أخضر للفتح
                        .setTitle(`🔓 تم فتح القناة النصية: #${channel.name}`)
                        .setDescription(`**تم فتح القناة بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}\n\n**يمكن للأعضاء الآن إرسال رسائل، صور/ملفات، إنشاء ثريدات، التحدث فيها، واستخدام أوامر التطبيقات.**`)
                        .setTimestamp();
                } else if (channel.type === ChannelType.GuildVoice) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        Speak: null,                        // للقنوات الصوتية: إزالة إعداد المنع
                        UseApplicationCommands: null        // إزالة إعداد منع استخدام أوامر التطبيقات
                    });
                    embed = new EmbedBuilder()
                        .setColor(0x00FF00) // أخضر للفتح
                        .setTitle(`🔓 تم فتح القناة الصوتية: ${channel.name}`)
                        .setDescription(`**تم فتح القناة الصوتية بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}\n\n**يمكن للأعضاء الآن التحدث في هذه القناة واستخدام أوامر التطبيقات.**`)
                        .setTimestamp();
                } else {
                    return interaction.reply({ content: 'يمكنني فتح القنوات النصية أو الصوتية فقط.', ephemeral: true });
                }

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('خطأ في فتح القناة:', error);
                await interaction.reply({ content: `حدث خطأ أثناء فتح القناة ${channel.name}. يرجى التأكد من أن البوت لديه صلاحية "إدارة القنوات".`, ephemeral: true });
            }
        }
    },
};