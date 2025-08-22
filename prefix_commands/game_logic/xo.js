// prefix_commands/game_logic/xo.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

// قاموس لتتبع ألعاب XO التي تنتظر لاعبين للانضمام
const pendingXOGames = new Map(); // مفتاح: channel.id, قيمة: { initiatorId, playersInGame (Set), message, timeout, gameStartTime, countdownInterval }

// قاموس لتتبع ألعاب XO الجارية (بعد اكتمال اللاعبين)
const activeXOGames = new Map(); // مفتاح: channel.id, قيمة: { playerX, playerO, board, currentPlayer, gameMessage }

// الدالة لرسم لوحة XO بناءً على الحالة الحالية
function drawBoard(board) {
    let boardStr = '';
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            boardStr += ` ${board[i * 3 + j]} `;
            if (j < 2) boardStr += '|';
        }
        if (i < 2) boardStr += '\n---+---+---\n';
    }
    return `\`\`\`\n${boardStr}\n\`\`\``;
}

// الدالة لإنشاء الأزرار التفاعلية للوحة
function createBoardButtons(board, gameActive = true) {
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            let label = '\u200b'; // ***** تم التعديل هنا: استخدام مسافة فارغة غير مرئية كـ label *****
            let style = ButtonStyle.Secondary;
            let disabled = !gameActive || board[index] !== ' '; // تعطيل الزر إذا كانت اللعبة غير نشطة أو المربع مشغول

            if (board[index] === 'X') {
                label = 'X';
                style = ButtonStyle.Danger; // أحمر لـ X
                disabled = true;
            } else if (board[index] === 'O') {
                label = 'O';
                style = ButtonStyle.Primary; // أزرق لـ O
                disabled = true;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`xo_board_${index}`) // Custom ID لأزرار اللوحة
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(disabled),
            );
        }
        rows.push(row);
    }
    return rows;
}

// الدالة للتحقق من وجود فائز
function checkWinner(board, player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    return winPatterns.some(pattern =>
        pattern.every(index => board[index] === player)
    );
}

// الدالة للتحقق من التعادل
function checkDraw(board) {
    return board.every(cell => cell !== ' ');
}

module.exports = {
    name: 'xo',
    description: 'يبدأ دعوة للعبة XO.',
    usage: 'xo',
    aliases: ['tictactoe'],
    async execute(message, args) {
        // إذا كانت هناك لعبة XO تنتظر في هذه القناة
        if (pendingXOGames.has(message.channel.id)) {
            return message.reply({ content: 'هناك بالفعل دعوة لعبة XO معلقة في هذه القناة. يرجى الانضمام إليها أو الانتظار حتى تنتهي.', flags: PermissionsBitField.Flags.Ephemeral });
        }
        // إذا كانت هناك لعبة XO جارية بالفعل
        if (activeXOGames.has(message.channel.id)) {
            return message.reply({ content: 'هناك لعبة XO جارية بالفعل في هذه القناة. يرجى الانتظار حتى تنتهي أو استخدام قناة أخرى.', flags: PermissionsBitField.Flags.Ephemeral });
        }


        const initiator = message.author;
        const gameDuration = 30 * 1000; // مدة انتظار اللاعبين للانضمام (30 ثانية)
        const initialWaitTime = 10; // ثواني للعد التنازلي المبدئي لظهور "تبدأ اللعبة بعد X ثانية"
        const gameStartTime = Date.now() + (initialWaitTime * 1000);

        const playersInGame = new Set();
        playersInGame.add(initiator.id); // المبتدئ ينضم تلقائياً

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('XO')
            .setDescription(
                `**طريقة اللعب:**\n` +
                `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                `**اللاعبين المشاركين:** (${playersInGame.size}/2)\n` +
                `- <@${initiator.id}>\n\n` +
                `ستبدأ اللعبة بعد ${initialWaitTime} ثانية`
            )
            .setFooter({ text: 'لعبة XO تفاعلية' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('xo_join_game')
                    .setLabel('دخول إلى اللعبة')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('xo_leave_game')
                    .setLabel('اخرج من اللعبة')
                    .setStyle(ButtonStyle.Danger),
            );

        const gameMessage = await message.channel.send({
            embeds: [embed],
            components: [row],
        });

        // مؤقت لـ "تبدأ اللعبة بعد X ثانية"
        let countdown = initialWaitTime;
        const countdownInterval = setInterval(async () => {
            if (pendingXOGames.has(message.channel.id)) {
                const currentGameState = pendingXOGames.get(message.channel.id);
                // منع التحديث إذا كانت اللعبة قد بدأت بالفعل (انتقل إلى activeXOGames)
                if (!currentGameState || !currentGameState.message || currentGameState.message.id !== gameMessage.id) {
                    clearInterval(countdownInterval);
                    return;
                }

                countdown--;
                const remainingTimeForDisplay = Math.max(0, countdown); // لا تعرض أقل من 0

                const updatedDescription = `**طريقة اللعب:**\n` +
                    `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                    `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                    `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                    `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                    `**اللاعبين المشاركين:** (${currentGameState.playersInGame.size}/2)\n` +
                    Array.from(currentGameState.playersInGame).map(id => `- <@${id}>`).join('\n') + `\n\n` +
                    (remainingTimeForDisplay > 0 ? `ستبدأ اللعبة بعد ${remainingTimeForDisplay} ثانية` : `تبدأ اللعبة الآن!`);
                
                const updatedEmbed = EmbedBuilder.from(currentGameState.message.embeds[0])
                    .setDescription(updatedDescription);

                await currentGameState.message.edit({
                    embeds: [updatedEmbed],
                    components: [currentGameState.message.components[0]],
                }).catch(console.error);

                if (countdown <= 0) {
                    clearInterval(countdownInterval); // إيقاف العد التنازلي
                }
            } else {
                clearInterval(countdownInterval); // إيقاف إذا لم تعد اللعبة معلقة
            }
        }, 1000);


        // مؤقت لانتهاء فترة الانضمام
        const gameTimeout = setTimeout(async () => {
            if (pendingXOGames.has(message.channel.id)) {
                const gameData = pendingXOGames.get(message.channel.id);
                clearInterval(gameData.countdownInterval); // إيقاف أي عد تنازلي نشط

                if (gameData.playersInGame.size < 2) {
                    await gameData.message.edit({
                        content: 'تم إلغاء لعبة XO: لم ينضم عدد كافٍ من اللاعبين (مطلوب 2).',
                        embeds: [],
                        components: [],
                    }).catch(console.error);
                } else {
                    // **** هنا نبدأ اللعبة الفعلية (لوحة XO) ****
                    const playersArray = Array.from(gameData.playersInGame).map(id => message.guild.members.cache.get(id) || { id: id, username: 'Unknown User' });
                    // تأكد أن اللاعبين موجودين قبل الاختيار
                    if (playersArray.length < 2) {
                        await gameData.message.edit({
                            content: 'تم إلغاء لعبة XO: حدث خطأ في تحديد اللاعبين.',
                            embeds: [],
                            components: [],
                        }).catch(console.error);
                        pendingXOGames.delete(message.channel.id);
                        return;
                    }
                    const starter = playersArray[Math.floor(Math.random() * playersArray.length)];
                    const opponent = playersArray.find(p => p.id !== starter.id);

                    const initialBoardState = {
                        board: Array(9).fill(' '),
                        players: { X: starter, O: opponent },
                        currentPlayer: 'X', // X يبدأ دائماً
                        gameMessage: gameData.message // نستخدم نفس الرسالة لتحديثها
                    };
                    activeXOGames.set(message.channel.id, initialBoardState);

                    const gameEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✖️⭕ لعبة XO بدأت! ⭕✖️')
                        .setDescription(`اللاعبون: ${starter} (X) vs ${opponent} (O).\n\n**الآن دور ${starter} (X)!**`)
                        .addFields({ name: 'اللوحة:', value: drawBoard(initialBoardState.board) });

                    await gameData.message.edit({
                        embeds: [gameEmbed],
                        components: createBoardButtons(initialBoardState.board),
                    }).catch(console.error);
                }
                pendingXOGames.delete(message.channel.id); // إزالة اللعبة من قائمة الانتظار
            }
        }, gameDuration); // المدة الكاملة للانتظار قبل بدء اللعبة أو إلغائها

        pendingXOGames.set(message.channel.id, {
            initiatorId: initiator.id,
            playersInGame: playersInGame,
            message: gameMessage,
            timeout: gameTimeout,
            gameStartTime: gameStartTime,
            countdownInterval: countdownInterval // حفظ هذا لتمكنا من مسحه
        });
    },

    // معالج تفاعلات الأزرار (handleButtonInteraction)
    async handleButtonInteraction(interaction) {
        // deferUpdate لمنع "Unknown interaction" لأننا سنرد لاحقًا
        await interaction.deferUpdate().catch(e => console.error('فشل في deferUpdate:', e)); 
        
        if (!interaction.customId.startsWith('xo_')) return;

        const channelId = interaction.channel.id;
        const userId = interaction.user.id;

        // 1. معالجة أزرار الانضمام/المغادرة (xo_join_game, xo_leave_game)
        if (interaction.customId === 'xo_join_game' || interaction.customId === 'xo_leave_game') {
            const gameData = pendingXOGames.get(channelId);

            if (!gameData || gameData.message.id !== interaction.message.id) {
                // هذا التفاعل ليس للعبة XO المعلقة في هذه القناة أو رسالة خاطئة
                // لا نرد بـ ephemeral هنا لأننا استخدمنا deferUpdate بالفعل
                return; 
            }

            if (interaction.customId === 'xo_join_game') {
                if (gameData.playersInGame.has(userId)) {
                    // لا نرد بـ ephemeral هنا لأننا استخدمنا deferUpdate بالفعل
                    // بدلاً من ذلك، نرد برسالة "editReply" بعد deferUpdate
                    return interaction.followUp({ content: 'أنت بالفعل في قائمة الانتظار للعبة XO هذه!', flags: PermissionsBitField.Flags.Ephemeral });
                }
                if (gameData.playersInGame.size >= 2) { // XO هي لعبة لاعبين فقط
                    return interaction.followUp({ content: 'لعبة XO هذه ممتلئة بالفعل!', flags: PermissionsBitField.Flags.Ephemeral });
                }

                gameData.playersInGame.add(userId);
                clearTimeout(gameData.timeout); // إعادة ضبط المؤقت عند انضمام لاعب
                clearInterval(gameData.countdownInterval); // إيقاف العد التنازلي القديم

                // إذا اكتمل العدد، ابدأ اللعبة فوراً
                if (gameData.playersInGame.size === 2) {
                    const playersArray = Array.from(gameData.playersInGame).map(id => interaction.guild.members.cache.get(id) || { id: id, username: 'Unknown User' });
                    // تأكد أن اللاعبين موجودين قبل الاختيار
                    if (playersArray.length < 2) {
                        await interaction.editReply({
                            content: 'تم إلغاء لعبة XO: حدث خطأ في تحديد اللاعبين.',
                            embeds: [],
                            components: [],
                        }).catch(console.error);
                        pendingXOGames.delete(channelId);
                        return;
                    }
                    const starter = playersArray[Math.floor(Math.random() * playersArray.length)];
                    const opponent = playersArray.find(p => p.id !== starter.id);

                    const initialBoardState = {
                        board: Array(9).fill(' '),
                        players: { X: starter, O: opponent },
                        currentPlayer: 'X', // X يبدأ دائماً
                        gameMessage: gameData.message
                    };
                    activeXOGames.set(channelId, initialBoardState); // نقل اللعبة إلى قائمة الألعاب الجارية

                    const gameEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('✖️⭕ لعبة XO بدأت! ⭕✖️')
                        .setDescription(`اللاعبون: ${starter} (X) vs ${opponent} (O).\n\n**الآن دور ${starter} (X)!**`)
                        .addFields({ name: 'اللوحة:', value: drawBoard(initialBoardState.board) });

                    await interaction.editReply({ // استخدام editReply بعد deferUpdate
                        embeds: [gameEmbed],
                        components: createBoardButtons(initialBoardState.board),
                    }).catch(console.error);
                    pendingXOGames.delete(channelId); // إزالة اللعبة من قائمة الانتظار
                    return;
                }

                // تحديث رسالة الانضمام إذا لم يكتمل العدد بعد
                const remainingTimeForDisplay = Math.ceil((gameData.gameStartTime - Date.now()) / 1000); // يمكن إعادة حساب الوقت المتبقي

                const newDescription = `**طريقة اللعب:**\n` +
                    `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                    `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                    `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                    `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                    `**اللاعبين المشاركين:** (${gameData.playersInGame.size}/2)\n` +
                    Array.from(gameData.playersInGame).map(id => `- <@${id}>`).join('\n') + `\n\n` +
                    `ستبدأ اللعبة بعد ${Math.max(0, remainingTimeForDisplay)} ثانية`;
                
                const updatedEmbed = EmbedBuilder.from(gameData.message.embeds[0])
                    .setDescription(newDescription);

                await interaction.editReply({ // استخدام editReply بعد deferUpdate
                    embeds: [updatedEmbed],
                    components: [gameData.message.components[0]],
                }).catch(console.error);

                // إعادة تعيين مؤقت الانتهاء (GameTimeout)
                gameData.timeout = setTimeout(async () => {
                    if (pendingXOGames.has(channelId)) {
                        const gameDataCurrent = pendingXOGames.get(channelId);
                        clearInterval(gameDataCurrent.countdownInterval); // إيقاف العد التنازلي النهائي
                        if (gameDataCurrent.playersInGame.size < 2) {
                            await gameDataCurrent.message.edit({
                                content: 'تم إلغاء لعبة XO: لم ينضم عدد كافٍ من اللاعبين (مطلوب 2).',
                                embeds: [],
                                components: [],
                            }).catch(console.error);
                        } else {
                             const playersArray = Array.from(gameDataCurrent.playersInGame).map(id => interaction.guild.members.cache.get(id) || { id: id, username: 'Unknown User' });
                             if (playersArray.length < 2) {
                                await gameDataCurrent.message.edit({
                                    content: 'تم إلغاء لعبة XO: حدث خطأ في تحديد اللاعبين.',
                                    embeds: [],
                                    components: [],
                                }).catch(console.error);
                                pendingXOGames.delete(channelId);
                                return;
                            }
                             const starter = playersArray[Math.floor(Math.random() * playersArray.length)];
                             const opponent = playersArray.find(p => p.id !== starter.id);
         
                             const initialBoardState = {
                                 board: Array(9).fill(' '),
                                 players: { X: starter, O: opponent },
                                 currentPlayer: 'X',
                                 gameMessage: gameDataCurrent.message
                             };
                             activeXOGames.set(channelId, initialBoardState);
         
                             const gameEmbed = new EmbedBuilder()
                                 .setColor(0x00FF00)
                                 .setTitle('✖️⭕ لعبة XO بدأت! ⭕✖️')
                                 .setDescription(`اللاعبون: ${starter} (X) vs ${opponent} (O).\n\n**الآن دور ${starter} (X)!**`)
                                 .addFields({ name: 'اللوحة:', value: drawBoard(initialBoardState.board) });
         
                             await gameDataCurrent.message.edit({
                                 embeds: [gameEmbed],
                                 components: createBoardButtons(initialBoardState.board),
                             }).catch(console.error);
                        }
                        pendingXOGames.delete(channelId);
                    }
                }, gameDuration);
                
                // إعادة تعيين مؤقت العد التنازلي الجديد (CountdownInterval)
                // الأفضل أن يعتمد العد التنازلي على gameStartTime ناقص الوقت الحالي
                gameData.countdownInterval = setInterval(async () => {
                    if (pendingXOGames.has(channelId)) {
                        const currentGameState = pendingXOGames.get(channelId);
                        // منع التحديث إذا كانت اللعبة قد بدأت بالفعل (انتقل إلى activeXOGames)
                        if (!currentGameState || !currentGameState.message || currentGameState.message.id !== gameData.message.id) {
                            clearInterval(gameData.countdownInterval);
                            return;
                        }

                        const remainingTime = Math.ceil((currentGameState.gameStartTime - Date.now()) / 1000);
                        if (remainingTime <= 0) {
                            clearInterval(gameData.countdownInterval);
                        }
                        
                        const updatedDescription = `**طريقة اللعب:**\n` +
                            `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                            `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                            `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                            `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                            `**اللاعبين المشاركين:** (${currentGameState.playersInGame.size}/2)\n` +
                            Array.from(currentGameState.playersInGame).map(id => `- <@${id}>`).join('\n') + `\n\n` +
                            (remainingTime > 0 ? `ستبدأ اللعبة بعد ${remainingTime} ثانية` : `تبدأ اللعبة الآن!`);
                        
                        const updatedEmbed = EmbedBuilder.from(currentGameState.message.embeds[0])
                            .setDescription(updatedDescription);

                        await currentGameState.message.edit({
                            embeds: [updatedEmbed],
                            components: [currentGameState.message.components[0]],
                        }).catch(console.error);
                    } else {
                        clearInterval(gameData.countdownInterval);
                    }
                }, 1000);

                pendingXOGames.set(channelId, gameData); // تحديث الـ Map


            } else if (interaction.customId === 'xo_leave_game') {
                if (!gameData.playersInGame.has(userId)) {
                    return interaction.followUp({ content: 'أنت لست في قائمة الانتظار للعبة XO هذه!', flags: PermissionsBitField.Flags.Ephemeral });
                }

                gameData.playersInGame.delete(userId);
                clearTimeout(gameData.timeout); // إعادة ضبط المؤقت
                clearInterval(gameData.countdownInterval); // إيقاف العد التنازلي القديم

                if (gameData.playersInGame.size === 0) {
                    await interaction.editReply({ // استخدام editReply بعد deferUpdate
                        content: 'تم إلغاء لعبة XO: غادر جميع اللاعبين.',
                        embeds: [],
                        components: [],
                    }).catch(console.error);
                    pendingXOGames.delete(channelId);
                    return;
                }

                const remainingTimeForDisplay = Math.ceil((gameData.gameStartTime - Date.now()) / 1000); // يمكن إعادة حساب الوقت المتبقي

                const newDescription = `**طريقة اللعب:**\n` +
                    `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                    `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                    `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                    `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                    `**اللاعبين المشاركين:** (${gameData.playersInGame.size}/2)\n` +
                    Array.from(gameData.playersInGame).map(id => `- <@${id}>`).join('\n') + `\n\n` +
                    `ستبدأ اللعبة بعد ${Math.max(0, remainingTimeForDisplay)} ثانية`;

                const updatedEmbed = EmbedBuilder.from(gameData.message.embeds[0])
                    .setDescription(newDescription);

                await interaction.editReply({ // استخدام editReply بعد deferUpdate
                    embeds: [updatedEmbed],
                    components: [gameData.message.components[0]],
                }).catch(console.error);

                // إعادة تعيين مؤقت الانتهاء
                const newTimeout = setTimeout(async () => {
                    if (pendingXOGames.has(channelId)) {
                        const gameDataCurrent = pendingXOGames.get(channelId);
                        clearInterval(gameDataCurrent.countdownInterval); // إيقاف العد التنازلي النهائي
                        if (gameDataCurrent.playersInGame.size < 2) {
                            await gameDataCurrent.message.edit({
                                content: 'تم إلغاء لعبة XO: لم ينضم عدد كافٍ من اللاعبين (مطلوب 2).',
                                embeds: [],
                                components: [],
                            }).catch(console.error);
                        } else {
                             const playersArray = Array.from(gameDataCurrent.playersInGame).map(id => interaction.guild.members.cache.get(id) || { id: id, username: 'Unknown User' });
                             if (playersArray.length < 2) {
                                await gameDataCurrent.message.edit({
                                    content: 'تم إلغاء لعبة XO: حدث خطأ في تحديد اللاعبين.',
                                    embeds: [],
                                    components: [],
                                }).catch(console.error);
                                pendingXOGames.delete(channelId);
                                return;
                            }
                             const starter = playersArray[Math.floor(Math.random() * playersArray.length)];
                             const opponent = playersArray.find(p => p.id !== starter.id);
         
                             const initialBoardState = {
                                 board: Array(9).fill(' '),
                                 players: { X: starter, O: opponent },
                                 currentPlayer: 'X',
                                 gameMessage: gameDataCurrent.message
                             };
                             activeXOGames.set(channelId, initialBoardState);
         
                             const gameEmbed = new EmbedBuilder()
                                 .setColor(0x00FF00)
                                 .setTitle('✖️⭕ لعبة XO بدأت! ⭕✖️')
                                 .setDescription(`اللاعبون: ${starter} (X) vs ${opponent} (O).\n\n**الآن دور ${starter} (X)!**`)
                                 .addFields({ name: 'اللوحة:', value: drawBoard(initialBoardState.board) });
         
                             await gameDataCurrent.message.edit({
                                 embeds: [gameEmbed],
                                 components: createBoardButtons(initialBoardState.board),
                             }).catch(console.error);
                        }
                        pendingXOGames.delete(channelId);
                    }
                }, gameDuration);
                
                // إعادة تعيين مؤقت العد التنازلي الجديد
                gameData.countdownInterval = setInterval(async () => {
                    if (pendingXOGames.has(channelId)) {
                        const currentGameState = pendingXOGames.get(channelId);
                        // منع التحديث إذا كانت اللعبة قد بدأت بالفعل (انتقل إلى activeXOGames)
                        if (!currentGameState || !currentGameState.message || currentGameState.message.id !== gameData.message.id) {
                            clearInterval(gameData.countdownInterval);
                            return;
                        }

                        const remainingTime = Math.ceil((currentGameState.gameStartTime - Date.now()) / 1000);
                        if (remainingTime <= 0) {
                            clearInterval(gameData.countdownInterval);
                        }
                        
                        const updatedDescription = `**طريقة اللعب:**\n` +
                            `1- شارك في اللعبة بالضغط على الزر أدناه\n` +
                            `2- سيتم اختيار اللاعبين بشكل عشوائي للمنافسة في XO\n` +
                            `3- إذا خسرت في اللعبة، فسيتم طردك، وإذا كان هناك تعادل، فسيتم طرد كلا اللاعبين\n` +
                            `4- آخر لاعب بقي في الجولة الأخيرة سيفوز بالعبة\n\n` +
                            `**اللاعبين المشاركين:** (${currentGameState.playersInGame.size}/2)\n` +
                            Array.from(currentGameState.playersInGame).map(id => `- <@${id}>`).join('\n') + `\n\n` +
                            (remainingTime > 0 ? `ستبدأ اللعبة بعد ${remainingTime} ثانية` : `تبدأ اللعبة الآن!`);
                        
                        const updatedEmbed = EmbedBuilder.from(currentGameState.message.embeds[0])
                            .setDescription(updatedDescription);

                        await currentGameState.message.edit({
                            embeds: [updatedEmbed],
                            components: [currentGameState.message.components[0]],
                        }).catch(console.error);
                    } else {
                        clearInterval(gameData.countdownInterval);
                    }
                }, 1000);
                pendingXOGames.set(channelId, gameData); // تحديث الـ Map
            }

        } else if (interaction.customId.startsWith('xo_board_')) { // 2. معالجة أزرار لوحة اللعب (XO الفعلية)
            const game = activeXOGames.get(channelId);

            if (!game || game.gameMessage.id !== interaction.message.id) {
                // إذا لم تكن هذه هي اللعبة النشطة، لا تفعل شيئاً ( deferUpdate كافية)
                return;
            }

            // تحقق مما إذا كان اللاعب الصحيح هو الذي يضغط على الزر
            if (userId !== game.players[game.currentPlayer].id) {
                return interaction.followUp({ content: 'ليس دورك للعب!', flags: PermissionsBitField.Flags.Ephemeral });
            }

            const buttonIndex = parseInt(interaction.customId.split('_')[2]);

            if (isNaN(buttonIndex) || buttonIndex < 0 || buttonIndex > 8 || game.board[buttonIndex] !== ' ') {
                return interaction.followUp({ content: 'هذا المربع مشغول أو غير صالح!', flags: PermissionsBitField.Flags.Ephemeral });
            }

            // تحديث اللوحة
            game.board[buttonIndex] = game.currentPlayer;

            // التحقق من الفوز
            if (checkWinner(game.board, game.currentPlayer)) {
                const winner = game.players[game.currentPlayer];
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎉 انتهاء لعبة XO 🎉')
                    .setDescription(`فاز اللاعب ${winner} (${game.currentPlayer})!\n\n**اللوحة النهائية:**`)
                    .addFields({ name: 'اللوحة:', value: drawBoard(game.board) });

                await interaction.editReply({ // استخدام editReply بعد deferUpdate
                    embeds: [embed],
                    components: createBoardButtons(game.board, false), // تعطيل الأزرار
                });
                activeXOGames.delete(channelId); // إزالة اللعبة من القائمة النشطة
                return;
            }

            // التحقق من التعادل
            if (checkDraw(game.board)) {
                const embed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle('🤝 انتهاء لعبة XO - تعادل! 🤝')
                    .setDescription('اللوحة مليئة! لا يوجد فائز.')
                    .addFields({ name: 'اللوحة:', value: drawBoard(game.board) });

                await interaction.editReply({ // استخدام editReply بعد deferUpdate
                    embeds: [embed],
                    components: createBoardButtons(game.board, false), // تعطيل الأزرار
                });
                activeXOGames.delete(channelId);
                return;
            }

            // تبديل اللاعب
            game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

            // تحديث الرسالة باللوحة الجديدة ودور اللاعب التالي
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✖️⭕ لعبة XO ⭕✖️')
                .setDescription(`الآن دور ${game.players[game.currentPlayer]} (${game.currentPlayer})!`)
                .addFields({ name: 'اللوحة:', value: drawBoard(game.board) });

            await interaction.editReply({ // استخدام editReply بعد deferUpdate
                embeds: [embed],
                components: createBoardButtons(game.board),
            });

            activeXOGames.set(channelId, game); // تحديث الحالة بعد كل حركة
        }
    },
};ى