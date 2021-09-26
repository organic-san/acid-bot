const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reaction')
        .setDescription('給你一點溫馨的反應')
        .addSubcommand(opt =>
            opt.setName('happybeam')
            .setDescription('快樂光線(/  ≧▽≦)/=====)')
        )
        .addSubcommand(opt =>
            opt.setName('goodnight')
            .setDescription('晚安~')
        ),
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    tag: "interaction",
	async execute(interaction) {
        if (interaction.options.getSubcommand() === 'happybeam') {

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
        } else if(interaction.options.getSubcommand() === 'goodnight') {

            switch(Math.floor(Math.random()*2)){
                case 0:
                    interaction.reply("今夜有個好夢 ( ˘ω˘ )睡…");
                    break;
                case 1:
                    interaction.reply("+｡:.゜晚安ヽ(´∀`)ﾉ .:｡+゜｡");
                    break;
            }
        }
	},
};