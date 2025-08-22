// slash/commands/utility/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('يرد بسرعة استجابة البوت.'), // الوصف بالعربي

    async execute(interaction) {
        // وقت البدء قبل تنفيذ أي شيء
        const sent = await interaction.reply({ content: 'جاري قياس وقت الاستجابة...', ephemeral: true, fetchReply: true });

        // حساب وقت الاستجابة (Latency)
        const timeLatency = sent.createdTimestamp - interaction.createdTimestamp;

        // حساب وقت استجابة API (Micro)
        const apiLatency = interaction.client.ws.ping; // هذا هو الـ WS latency، وغالباً ما يشار إليه بالـ API latency

        // بناء Embed للرد
        const embed = new EmbedBuilder()
            .setColor(0x0099FF) // لون أزرق
            .setTitle('Pong! 🏓')
            .addFields(
                { name: '⌛ وقت الاستجابة:', value: `${timeLatency} ملي ثانية`, inline: true }, // Latency
                { name: '✨ وقت معالجة دقيقة:', value: `${apiLatency} ملي ثانية`, inline: true }, // WS Ping (غالباً ما يسمى Micro)
                { name: '⏱️ ويب سوكيت:', value: `${interaction.client.ws.ping} ملي ثانية`, inline: true } // WS Ping
            )
            .setFooter({ text: `تم الطلب بواسطة ${interaction.user.tag}` })
            .setTimestamp();

        // الرد على المستخدم برسالة مرئية للجميع
        await interaction.editReply({ content: '', embeds: [embed], ephemeral: false });
    },
};