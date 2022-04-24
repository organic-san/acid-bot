const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('invite')
		.setDescription('機器人的邀請連結'),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const row = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
                .setLabel('邀請連結')
                .setStyle('LINK')
                .setURL("https://discord.com/api/oauth2/authorize?client_id=951850646498336808&permissions=1556694297825&scope=bot%20applications.commands"),
            new Discord.MessageButton()
                .setLabel('開發伺服器')
                .setStyle('LINK')
                .setURL("https://discord.gg/hveXGk5Qmz"),
            new Discord.MessageButton()
                .setLabel('github連結')
                .setStyle('LINK')
                .setURL("https://github.com/organic-san/acid-bot"),
        );

        await interaction.reply({ content: '我的邀請連結! 連結可由伺服器管理員使用。\n' + 
            '註: 機器人換了新的版本:ester bot!\n功能比acid bot更為豐富，邀請ester bot便會將所有檔案轉移到新的機器人，不用擔心紀錄丟失!', components: [row] });
    }
};