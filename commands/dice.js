const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const textCommand = require('../JSmodule/textModule');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dice')
		.setDescription('丟個骰子')
        .addIntegerOption(opt => 
            opt.setName('side')
            .setDescription('骰子的面數')
            .setRequired(true)
        ).addIntegerOption(opt => 
            opt.setName('count')
            .setDescription('骰子的顆數')
            ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const side = interaction.options.getInteger('side');
        const count = interaction.options.getInteger('count') ?? 1;

        interaction.reply(textCommand.dice(side, count));
	},
};