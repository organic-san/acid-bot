const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('happy-birthday')
		.setDescription('唱一首生日快樂歌!')
        .addUserOption(opt => 
            opt.setName('user')
            .setDescription('要獻唱的對象!')
            .setRequired(true)
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const user = interaction.options.getUser('user');

        if(user.id === interaction.user.id) 
            return interaction.reply({content: `連生日快樂歌都想唱給自己啊?你真邊緣阿......`, ephemeral: true})
        
        switch(Math.floor(Math.random()*2)){
            case 0:
                interaction.reply(`Happy birthday to you\nHappy birthday to you\nHappy birthday, dear ${user}\nHappy birthday to you`);
                break;
            case 1:
                interaction.reply(`祝你生日快樂\\~\\~\n祝你生日快樂\\~\\~\n祝${user}生日快樂\\~\\~\\~\n祝你生日快樂\\~\\~\\~\\~\\~\n`);
                break;
        }
    }
};