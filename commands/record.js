const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('record')
		.setDescription('紀錄某一則訊息')
        .addStringOption(opt => 
            opt.setName('message-id')
            .setDescription('訊息ID')
            .setRequired(true)
        ).addChannelOption(opt => 
            opt.setName('channel')
            .setDescription('該訊息所在的頻道，空白視為發送訊息的頻道')
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const messageId = interaction.options.getString('message-id');
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        
        if(!channel.isText()) return interaction.reply({content: '這個頻道似乎不是文字頻道。', ephemeral: true});
        channel.messages.fetch(messageId).then(async message => 
            {
                if(message.author.bot) return interaction.reply({content: "噢，無法記錄機器人的訊息:(", ephemeral: true});

                const fileimage = message.attachments.first();
                const embeedrecord = new Discord.MessageEmbed()
                    .setColor(process.env.EMBEDCOLOR)
                    .setTimestamp()
                    .setDescription(message.content)
                    .setFooter(`${interaction.client.user.tag} 記其志於此`, interaction.client.user.displayAvatarURL({dynamic: true}))
                    .addField(`原文`, `[點一下這裡](${message.url})`)
                if (fileimage){
                    if (fileimage.height || fileimage.width)
                    { embeedrecord.setImage(fileimage.url); }
                }
                if(channel.type !== 'PartialDMChannel'){
                    embeedrecord.setAuthor(`${message.author.tag} 曾經在 #${channel.name} 這麼說過：`, 
                        message.author.displayAvatarURL({dynamic: true}))
                }else{
                    embeedrecord.setAuthor(`${message.author.tag} 曾經這麼說過：`, 
                        message.author.displayAvatarURL({dynamic: true}))
                }
                interaction.reply({embeds: [embeedrecord]});
            }
        ).catch(() => msg.reply({content: "噢，找不到訊息來記錄:(", ephemeral: true}));
    }
};