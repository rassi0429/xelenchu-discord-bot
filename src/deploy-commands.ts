import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from './config';

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Actionボタンを含むメッセージを送信します')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('スラッシュコマンドの登録を開始します...');

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log('スラッシュコマンドの登録が完了しました！');
    } catch (error) {
        console.error(error);
    }
})();