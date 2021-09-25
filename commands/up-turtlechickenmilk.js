const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('up-turtlechickenmilk')
		.setDescription('向上發射龜雞奶')
        .addIntegerOption(opt => 
            opt.setName('floor')
                .setDescription('所要發射的高度(樓層)')
                .setRequired(true)
        ),
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {Discord.Client} client 
     */
	async execute(interaction, client) {
		const floor = interaction.options.getInteger('floor');
        if(floor <= 100 && floor >= 1){
            const beforeMessage = await interaction.channel.messages.fetch({ before: interaction.id, limit: floor })
            .then(messages => messages.last())
            .catch(console.error)

            if(beforeMessage){
                if(!beforeMessage.deleted){ beforeMessage.react('🐢');
                    if(!beforeMessage.deleted) beforeMessage.react('🐔');
                    if(!beforeMessage.deleted) beforeMessage.react('🥛');
                    interaction.reply({content: "成功發射", ephemeral: true})
                }else interaction.reply({content: '失敗: 它好像已經被刪除了', ephemeral: true});
            }
        }
        else interaction.reply({content: '失敗: 數字請於合理範圍: 1-100', ephemeral: true});
	},
};