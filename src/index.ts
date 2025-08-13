import { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from './config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

async function sendErrorToWebhook(error: Error, context: string) {
    try {
        if (!config.errorWebhookUrl || config.errorWebhookUrl === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
            console.error('WebHook URLが設定されていません');
            return;
        }

        const errorMessage = {
            embeds: [{
                title: '⚠️ エラーが発生しました',
                color: 0xFF0000,
                fields: [
                    {
                        name: 'コンテキスト',
                        value: context,
                        inline: false
                    },
                    {
                        name: 'エラーメッセージ',
                        value: error.message || 'Unknown error',
                        inline: false
                    },
                    {
                        name: 'スタックトレース',
                        value: `\`\`\`${error.stack?.substring(0, 1000) || 'No stack trace'}\`\`\``,
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString()
            }]
        };

        const response = await fetch(config.errorWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(errorMessage)
        });

        if (!response.ok) {
            console.error('WebHookへの送信に失敗しました:', response.status);
        }
    } catch (webhookError) {
        console.error('WebHookエラー送信中にエラーが発生:', webhookError);
    }
}

client.once(Events.ClientReady, (c) => {
    try {
        console.log(`準備完了! ${c.user.tag}でログインしました`);
    } catch (error) {
        console.error('ClientReadyイベントでエラー:', error);
        sendErrorToWebhook(error as Error, 'ClientReady Event');
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'setup') {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: 'このコマンドはサーバー内でのみ使用できます。', ephemeral: true });
                return;
            }

            const member = interaction.member as any;
            const requiredRoleId = '1388860811136471141';
            
            if (!member.roles.cache.has(requiredRoleId)) {
                await interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
                return;
            }

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_channel')
                        .setLabel('先生になる！')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🙋')
                );

            await interaction.channel?.send({
                content: '下の参加するボタンを押して、あなたも先生になりましょう！',
                components: [row]
            });

            await interaction.reply({
                content: "OK",
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('コマンド処理中にエラー:', error);
        await sendErrorToWebhook(error as Error, `Command Interaction: ${interaction.isCommand() ? (interaction as any).commandName : 'Unknown'}`);
        
        try {
            if (interaction.isCommand() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'コマンドの処理中にエラーが発生しました。', 
                    ephemeral: true 
                });
            }
        } catch (replyError) {
            console.error('エラー応答の送信に失敗:', replyError);
        }
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'create_channel') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                if (!guild) {
                    await interaction.editReply('ギルドが見つかりません。');
                    return;
                }

                const member = interaction.member as any;
                if (!member) {
                    await interaction.editReply('メンバー情報が取得できません。');
                    return;
                }

                let channelCreatedRole = guild.roles.cache.get(config.channelCreatedRoleId);
                if (!channelCreatedRole) {
                    try {
                        channelCreatedRole = await guild.roles.create({
                            name: 'サポートチャンネル作成済み',
                            color: 0x00AE86,
                            reason: 'サポートチャンネル作成管理用ロール'
                        });
                        
                        console.log(`新しいロールが作成されました。ID: ${channelCreatedRole.id}`);
                        console.log(`このIDを.envファイルのCHANNEL_CREATED_ROLE_IDに設定してください。`);
                        
                        config.channelCreatedRoleId = channelCreatedRole.id;
                    } catch (error) {
                        console.error('ロール作成エラー:', error);
                        await interaction.editReply('ロールの作成中にエラーが発生しました。');
                        return;
                    }
                }

                if (member.roles.cache.has(channelCreatedRole.id)) {
                    await interaction.editReply('すでにサポートチャンネルを作成済みです。一人一つまでしか作成できません。');
                    return;
                }

                const category = guild.channels.cache.get(config.categoryId);
                if (!category || category.type !== ChannelType.GuildCategory) {
                    await interaction.editReply('指定されたカテゴリが見つかりません。');
                    return;
                }

                const channelName = `${interaction.user.username}`;
                
                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: config.categoryId,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ],
                        },
                        {
                            id: config.supportRoleId,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ],
                        },
                    ],
                });

                await member.roles.add(channelCreatedRole.id);

                await interaction.editReply(`提出・サポートチャンネル ${channel} が作成されました！`);
                
                await channel.send(`${interaction.user}先生！提出・サポートチャンネルへようこそ！\nこのチャンネルは、あなたと、おまとめ係の人しか見れないチャンネルです。ふしぎ文章の提出、個人的な質問などを受付します！\n\n 文章を書く人のための専用ツールをつくりました！　https://tategaki.kokoa.dev/ \n 改ページや、文章のレイアウトを確認しながら書くことができます！ \n このエディタでできない、画像や漫画、ほかのスタイルでの文章で提出することもできます！その場合は、このチャンネルでお知らせください！`);

            } catch (error) {
                console.error('チャンネル作成エラー:', error);
                await interaction.editReply('チャンネルの作成中にエラーが発生しました。');
                throw error;
            }
        }
    } catch (error) {
        console.error('ボタン処理中にエラー:', error);
        await sendErrorToWebhook(error as Error, `Button Interaction: ${interaction.isButton() ? interaction.customId : 'Unknown'}`);
        
        try {
            if (interaction.isButton() && interaction.deferred) {
                await interaction.editReply('処理中にエラーが発生しました。');
            } else if (interaction.isButton() && !interaction.replied) {
                await interaction.reply({ 
                    content: '処理中にエラーが発生しました。', 
                    ephemeral: true 
                });
            }
        } catch (replyError) {
            console.error('エラー応答の送信に失敗:', replyError);
        }
    }
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await sendErrorToWebhook(new Error(String(reason)), 'Unhandled Rejection');
});

process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await sendErrorToWebhook(error, 'Uncaught Exception');
    process.exit(1);
});

(async () => {
    try {
        await client.login(config.token);
    } catch (error) {
        console.error('ログインに失敗しました:', error);
        await sendErrorToWebhook(error as Error, 'Bot Login Failed');
        process.exit(1);
    }
})();
