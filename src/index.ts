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

client.once(Events.ClientReady, (c) => {
    console.log(`準備完了! ${c.user.tag}でログインしました`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setup') {
        // ロールチェック
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
        })
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
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

            // ロールが存在するかチェック、なければ作成
            let channelCreatedRole = guild.roles.cache.get(config.channelCreatedRoleId);
            if (!channelCreatedRole) {
                try {
                    channelCreatedRole = await guild.roles.create({
                        name: 'サポートチャンネル作成済み',
                        color: 0x00AE86,
                        reason: 'サポートチャンネル作成管理用ロール'
                    });
                    
                    // 作成したロールIDを.envファイルに保存するようユーザーに通知
                    console.log(`新しいロールが作成されました。ID: ${channelCreatedRole.id}`);
                    console.log(`このIDを.envファイルのCHANNEL_CREATED_ROLE_IDに設定してください。`);
                    
                    // config.channelCreatedRoleIdを更新
                    config.channelCreatedRoleId = channelCreatedRole.id;
                } catch (error) {
                    console.error('ロール作成エラー:', error);
                    await interaction.editReply('ロールの作成中にエラーが発生しました。');
                    return;
                }
            }

            // すでにロールを持っているかチェック
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

            // ロールを付与
            await member.roles.add(channelCreatedRole.id);

            await interaction.editReply(`提出・サポートチャンネル ${channel} が作成されました！`);
            
            await channel.send(`${interaction.user}先生！提出・サポートチャンネルへようこそ！\nこのチャンネルは、あなたと、おまとめ係の人しか見れないチャンネルです。ふしぎ文章の提出、個人的な質問などを受付します！\n\n 文章を書く人のための専用ツールをつくりました！　https://tategaki.kokoa.dev/ \n 改ページや、文章のレイアウトを確認しながら書くことができます！ \n このエディタでできない、画像や漫画、ほかのスタイルでの文章で提出することもできます！その場合は、このチャンネルでお知らせください！`);

        } catch (error) {
            console.error('チャンネル作成エラー:', error);
            await interaction.editReply('チャンネルの作成中にエラーが発生しました。');
        }
    }
});

client.login(config.token);
