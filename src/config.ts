import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.CLIENT_ID!,
    guildId: process.env.GUILD_ID!,
    categoryId: process.env.CATEGORY_ID!,
    supportRoleId: process.env.SUPPORT_ROLE_ID!,
    actionChannelId: process.env.ACTION_CHANNEL_ID!,
};