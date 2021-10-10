const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('返回目前的延遲(ms)'),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
		let delay = "和伺服器的平均延遲時間: " + interaction.client.ws.ping + "ms";
		const msg = await interaction.reply({content: delay, fetchReply: true});
		delay += "\n收到訊息到發出的延遲時間: " + (msg.createdTimestamp - interaction.createdTimestamp) + "ms";
		interaction.editReply({content: delay, fetchReply: true});
	},
};