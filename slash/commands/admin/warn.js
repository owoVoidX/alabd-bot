// slash/commands/moderation/warn.js
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// مسار ملف تخزين التحذيرات
const warningsFilePath = path.resolve(__dirname, '../../../warnings.json');

// دالة لقراءة التحذيرات من الملف
function readWarnings() {
    try {
        const data = fs.readFileSync(warningsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            fs.writeFileSync(warningsFilePath, JSON.stringify({}, null, 4), 'utf8'); // إنشاء الملف إذا لم يكن موجوداً
            return {};
        }
        console.error('خطأ في قراءة ملف التحذيرات:', error);
        return null; // للإشارة إلى خطأ
    }
}

// دالة لكتابة التحذيرات إلى الملف
function writeWarnings(warningsData) {
    try {
        fs.writeFileSync(warningsFilePath, JSON.stringify(warningsData, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error('خطأ في كتابة ملف التحذيرات:', error);
        return false; // للإشارة إلى خطأ
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('إدارة تحذيرات الأعضاء.') // الوصف بالعربي
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers) // يتطلب صلاحية طرد الأعضاء
        // أمر فرعي: add
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('إضافة تحذير لعضو.') // الوصف بالعربي
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('العضو المراد تحذيره.') // الوصف بالعربي
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('سبب التحذير.') // الوصف بالعربي
                        .setRequired(false)))
        // أمر فرعي: remove
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إزالة تحذير/تحذيرات من عضو محدد أو من الكل.') // الوصف بالعربي
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('العضو المراد إزالة تحذيراته (اتركه فارغاً لإزالة كل تحذيرات السيرفر).') // الوصف بالعربي
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('warn_id')
                        .setDescription('معرّف التحذير المحدد لإزالته (اتركه فارغاً لإزالة جميع التحذيرات للعضو).') // الوصف بالعربي
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('سبب إزالة التحذير/التحذيرات.') // الوصف بالعربي
                        .setRequired(false)))
        // أمر فرعي: list
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض قائمة بتحذيرات السيرفر أو عضو محدد.') // الوصف بالعربي
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('العضو الذي تريد عرض تحذيراته (اتركه فارغاً لعرض تحذيرات السيرفر).') // الوصف بالعربي
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('رقم الصفحة لعرض التحذيرات (افتراضي: 1).') // الوصف بالعربي
                        .setMinValue(1)
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id; // هذا ضروري للتحذيرات الخاصة بكل سيرفر

        let warnings = readWarnings();
        if (warnings === null) {
            return interaction.reply({ content: 'حدث خطأ أثناء الوصول إلى بيانات التحذيرات.', ephemeral: true });
        }

        // تنفيذ الأمر الفرعي بناءً على الاختيار
        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const targetMember = interaction.options.getMember('user');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب.';

            if (!targetMember) {
                return interaction.reply({ content: 'لم أتمكن من العثور على هذا المستخدم في السيرفر.', ephemeral: true });
            }
            if (targetUser.bot) {
                return interaction.reply({ content: 'لا يمكنك تحذير بوت!', ephemeral: true });
            }
            if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: 'لا يمكنك تحذير مسؤول إلا إذا كنت مالك السيرفر!', ephemeral: true });
            }
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ content: 'لا يمكنني تحذير هذا العضو لأن رتبته أعلى من رتبتي أو مساوية لها.', ephemeral: true });
            }
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ content: 'لا يمكنك تحذير نفسك!', ephemeral: true });
            }

            if (!warnings[guildId]) {
                warnings[guildId] = {};
            }
            if (!warnings[guildId][targetUser.id]) {
                warnings[guildId][targetUser.id] = [];
            }

            const warnId = warnings[guildId][targetUser.id].length > 0
                ? Math.max(...warnings[guildId][targetUser.id].map(w => w.id)) + 1
                : 1;

            const newWarning = {
                id: warnId,
                moderator: interaction.user.tag,
                moderatorId: interaction.user.id,
                timestamp: new Date().toISOString(),
                reason: reason
            };

            warnings[guildId][targetUser.id].push(newWarning);

            if (writeWarnings(warnings)) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500) // لون برتقالي للتحذير
                    .setTitle('تم إصدار تحذير جديد')
                    .setDescription(`**العضو:** ${targetUser.tag} (${targetUser.id})\n**السبب:** ${reason}\n**معرّف التحذير:** ${warnId}`)
                    .setFooter({ text: `تم التحذير بواسطة ${interaction.user.tag}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: false });

                try {
                    await targetUser.send(`لقد تلقيت تحذيراً في **${interaction.guild.name}** بسبب: "${reason}". معرّف التحذير: ${warnId}.`);
                } catch (dmError) {
                    console.warn(`تعذر إرسال رسالة خاصة إلى ${targetUser.tag}: ${dmError.message}`);
                }
            } else {
                await interaction.reply({ content: 'حدث خطأ أثناء حفظ التحذير.', ephemeral: true });
            }

        } else if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('user');
            const warnId = interaction.options.getInteger('warn_id');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب.';

            if (!warnings[guildId] || Object.keys(warnings[guildId]).length === 0) {
                return interaction.reply({ content: 'لا توجد تحذيرات مسجلة لهذا السيرفر.', ephemeral: true });
            }

            if (!targetUser) {
                // إزالة جميع التحذيرات من السيرفر (إذا لم يتم تحديد مستخدم)
                delete warnings[guildId];
                if (writeWarnings(warnings)) {
                    return interaction.reply({ content: `تمت إزالة جميع التحذيرات لهذا السيرفر. السبب: ${reason}`, ephemeral: false });
                } else {
                    return interaction.reply({ content: 'حدث خطأ أثناء حفظ التغييرات على التحذيرات.', ephemeral: true });
                }
            }

            if (!warnings[guildId][targetUser.id] || warnings[guildId][targetUser.id].length === 0) {
                return interaction.reply({ content: `${targetUser.tag} ليس لديه أي تحذيرات.`, ephemeral: true });
            }

            if (warnId) {
                const initialLength = warnings[guildId][targetUser.id].length;
                warnings[guildId][targetUser.id] = warnings[guildId][targetUser.id].filter(w => w.id !== warnId);

                if (warnings[guildId][targetUser.id].length === initialLength) {
                    return interaction.reply({ content: `لم يتم العثور على تحذير بالمعرّف ${warnId} للعضو ${targetUser.tag}.`, ephemeral: true });
                }
                if (warnings[guildId][targetUser.id].length === 0) {
                    delete warnings[guildId][targetUser.id];
                }
                if (writeWarnings(warnings)) {
                    await interaction.reply({ content: `تمت إزالة التحذير ذو المعرّف ${warnId} من ${targetUser.tag}. السبب: ${reason}`, ephemeral: false });
                } else {
                    await interaction.reply({ content: 'حدث خطأ أثناء حفظ التغييرات على التحذيرات.', ephemeral: true });
                }
            } else {
                delete warnings[guildId][targetUser.id];
                if (writeWarnings(warnings)) {
                    await interaction.reply({ content: `تمت إزالة جميع التحذيرات للعضو ${targetUser.tag}. السبب: ${reason}`, ephemeral: false });
                } else {
                    await interaction.reply({ content: 'حدث خطأ أثناء حفظ التغييرات على التحذيرات.', ephemeral: true });
                }
            }

        } else if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('user');
            const page = interaction.options.getInteger('page') || 1;
            const warningsPerPage = 5;

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTimestamp();

            if (!warnings[guildId] || Object.keys(warnings[guildId]).length === 0) {
                return interaction.reply({ content: 'لا توجد تحذيرات مسجلة لهذا السيرفر.', ephemeral: true });
            }

            if (targetUser) {
                if (!warnings[guildId][targetUser.id] || warnings[guildId][targetUser.id].length === 0) {
                    return interaction.reply({ content: `${targetUser.tag} ليس لديه أي تحذيرات.`, ephemeral: true });
                }

                const userWarnings = warnings[guildId][targetUser.id];
                const totalPages = Math.ceil(userWarnings.length / warningsPerPage);

                if (page > totalPages) {
                    return interaction.reply({ content: `الصفحة ${page} غير موجودة. يوجد ${totalPages} صفحة فقط لتحذيرات ${targetUser.tag}.`, ephemeral: true });
                }

                const startIndex = (page - 1) * warningsPerPage;
                const endIndex = startIndex + warningsPerPage;
                const paginatedWarnings = userWarnings.slice(startIndex, endIndex);

                embed.setTitle(`تحذيرات ${targetUser.tag} (${userWarnings.length} تحذير إجمالي)`)
                    .setDescription(`الصفحة ${page}/${totalPages}`);

                if (paginatedWarnings.length > 0) {
                    for (const warn of paginatedWarnings) {
                        const warnDate = new Date(warn.timestamp).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' }); // تنسيق عربي ووقت السعودية
                        embed.addFields(
                            { name: `معرّف التحذير: ${warn.id} - بواسطة: @${warn.moderator}`, value: `**السبب:** ${warn.reason}\n**التاريخ:** ${warnDate}` }
                        );
                    }
                } else {
                    embed.setDescription("لم يتم العثور على تحذيرات لهذا المستخدم في هذه الصفحة.");
                }

            } else {
                const allServerWarnings = [];
                for (const userId in warnings[guildId]) {
                    const user = await interaction.client.users.fetch(userId).catch(() => null);
                    if (user) {
                        warnings[guildId][userId].forEach(warn => {
                            allServerWarnings.push({
                                userTag: user.tag,
                                userId: user.id,
                                warnId: warn.id,
                                moderator: warn.moderator,
                                reason: warn.reason,
                                timestamp: warn.timestamp
                            });
                        });
                    }
                }

                if (allServerWarnings.length === 0) {
                    return interaction.reply({ content: 'لا توجد تحذيرات مسجلة لهذا السيرفر.', ephemeral: true });
                }

                allServerWarnings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const totalPages = Math.ceil(allServerWarnings.length / warningsPerPage);

                if (page > totalPages) {
                    return interaction.reply({ content: `الصفحة ${page} غير موجودة. يوجد ${totalPages} صفحة فقط من تحذيرات السيرفر.`, ephemeral: true });
                }

                const startIndex = (page - 1) * warningsPerPage;
                const endIndex = startIndex + warningsPerPage;
                const paginatedWarnings = allServerWarnings.slice(startIndex, endIndex);

                embed.setTitle(`جميع تحذيرات السيرفر (${allServerWarnings.length} تحذير إجمالي)`)
                    .setDescription(`الصفحة ${page}/${totalPages}`);

                if (paginatedWarnings.length > 0) {
                    for (const warn of paginatedWarnings) {
                        const warnDate = new Date(warn.timestamp).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' }); // تنسيق عربي ووقت السعودية
                        embed.addFields(
                            { name: `معرّف التحذير: ${warn.warnId} - المستخدم: ${warn.userTag} - بواسطة: @${warn.moderator}`, value: `**السبب:** ${warn.reason}\n**التاريخ:** ${warnDate}` }
                        );
                    }
                } else {
                    embed.setDescription("لم يتم العثور على تحذيرات في هذه الصفحة.");
                }
            }

            await interaction.reply({ embeds: [embed], ephemeral: false });
        }
    },
};