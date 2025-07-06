const Discord = require("discord.js");
const token = process.env.TOKEN; // قراءة التوكن من متغيرات البيئة
const client = new Discord.Client({ // <--- هنا التعديل المهم
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages, // تعديل هنا، يبدو أنك كتبتها GuildMessage
        Discord.GatewayIntentBits.MessageContent,
    ],
});

client.once(Discord.Events.ClientReady, () => {
    console.log(`Logged in as: ${client.user.tag}`);
});

client.login(token);