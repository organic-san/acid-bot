const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('response')
        .setDescription('給你一點溫馨的反應')
        .addSubcommand(opt =>
            opt.setName('happybeam')
            .setDescription('快樂光線(/  ≧▽≦)/=====)')
        )
        .addSubcommand(opt =>
            opt.setName('goodnight')
            .setDescription('晚安~')
        ).addSubcommand(opt => 
            opt.setName('up-crazy-night')
            .setDescription('向上發射龜雞奶')
            .addIntegerOption(opt => 
                opt.setName('floor')
                    .setDescription('所要發射的高度(樓層)')
                    .setRequired(true)
            )),
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
        } else if(interaction.options.getSubcommand() === 'crazy-night') {
            const floor = interaction.options.getInteger('floor');
            if(floor <= 100 && floor >= 1){
                const beforeMessage = await interaction.channel.messages.fetch({ before: interaction.id, limit: floor })
                .then(messages => messages.last())
                .catch(console.error)

                if(beforeMessage){
                    if(!beforeMessage.deleted){ beforeMessage.react('🐢');
                        if(!beforeMessage.deleted) beforeMessage.react('🐔');
                        if(!beforeMessage.deleted) beforeMessage.react('🥛');
                        interaction.reply({content: "成功發射!", ephemeral: true})
                    }else interaction.reply({content: '失敗: 它好像已經被刪除了', ephemeral: true});
                }
            }
            else interaction.reply({content: '失敗: 數字請於合理範圍: 1-100', ephemeral: true});
        }
	},
};