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
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_channel')
                    .setLabel('Action')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

        await interaction.reply({
            content: 'Actionボタンをクリックしてサポートチャンネルを作成してください。',
            components: [row]
        });
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

            const member = interaction.member;
            if (!member) {
                await interaction.editReply('メンバー情報が取得できません。');
                return;
            }

            const category = guild.channels.cache.get(config.categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                await interaction.editReply('指定されたカテゴリが見つかりません。');
                return;
            }

            const channelName = `support-${interaction.user.username}`;
            
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

            await interaction.editReply(`サポートチャンネル ${channel} が作成されました！`);
            
            await channel.send(`${interaction.user}さん、サポートチャンネルへようこそ！\nサポートスタッフがまもなく対応いたします。`);

        } catch (error) {
            console.error('チャンネル作成エラー:', error);
            await interaction.editReply('チャンネルの作成中にエラーが発生しました。');
        }
    }
});

client.login(config.token);