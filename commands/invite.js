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

        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`機器人的邀請連結`)
            .addField(`以下為機器人的邀請連結`,
            `https://discord.com/api/oauth2/authorize?client_id=848896873414524954&permissions=517342096638&scope=bot%20applications.commands`)
            .setFooter(`${interaction.client.user.tag}`, `${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            .setTimestamp();
        interaction.reply({embeds: [embed], ephemeral: true})
    }
};