const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('happybeam')
		.setDescription('快樂光線(/  ≧▽≦)/=====)'),
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {Discord.Client} client 
     */
	async execute(interaction, client) {
		var text = '(/  ≧▽≦)/=';
            for(step = 0; step < (Math.floor(Math.random()*6 + 10)); step++){
                text = text + '=';
            }
            for(step = 0; step < (Math.floor(Math.random()*3 + 1)); step++){
                text = text + ')';
            }
            if(Math.floor(Math.random()*9) === 0){
                if(Math.floor(Math.random() * 2)) 
                    text = `{\\\\__/}\n(  ≧▽≦)\n/ v      \\ ☞  ==============)`
                else text = '{\\\\__/}\n(⊙ω⊙)\n/ >▄︻̷̿┻̿═━一   =========))';}
            interaction.reply(text);
	},
};