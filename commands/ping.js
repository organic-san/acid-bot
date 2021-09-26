const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('返回目前的延遲(ms)'),
	tag: "client",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {Discord.Client} client 
     */
	async execute(interaction, client) {
		await interaction.reply({content: client.ws.ping + "ms"});
	},
};