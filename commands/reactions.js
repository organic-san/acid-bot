const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../JSmodule/guildInformationClass');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reactions')
        .setDescription('自動回應')
        .addSubcommand(opt =>
            opt.setName('show')
            .setDescription('顯示所有自動回應')
        )/*.addSubcommand(opt =>
            opt.setName('add')
            .setDescription('新增自動回應')
            .addStringOption(opt => 
                opt.setName('discover-message')
                .setDescription('要讓機器人自動回復的文字')
            ).addStringOption(opt => 
                opt.setName('reply-message')
                .setDescription('機器人要自動回應的文字')
        )*/,
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {

        if (interaction.options.getSubcommand() === 'show') {

            if(guildInformation.reactionsMuch === 0) return interaction.reply('這個伺服器並沒有設定專屬反應。');

            const pageShowHax = 12;
            let page = 0;

            const levels = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
            const row = new Discord.MessageActionRow()
			.addComponents(
				[
                    new Discord.MessageButton()
                        .setCustomId('上一頁')
                        .setLabel('上一頁')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('下一頁')
                        .setLabel('下一頁')
                        .setStyle('PRIMARY')
                ]
                
			);
            interaction.reply({embeds: [levels], components: [row]});

            const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot;
            const collector = interaction.channel.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if (i.customId === '下一頁') 
                    if(page * pageShowHax + pageShowHax < guildInformation.reactionsMuch) page++;
                if(i.customId === '上一頁')
                    if(page > 0) page--;
                guildInformation.sortUser();
                const levels = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
                i.update({embeds: [levels], components: [row]});
                collector.resetTimer({ time: 60 * 1000 });
            });
            
            collector.on('end', (c, r) => {
                if(r !== "messageDelete"){
                    const levels = reactionsShow(interaction.guild, guildInformation, page, pageShowHax);
                    interaction.editReply({embeds: [levels], components: []})
                }
            });
        
        } else if (interaction.options.getSubcommand() === 'add') {
            

        }
	},
};

/**
 * 顯示整個伺服器的經驗值排名
 * @param {Discord.Guild} guild 該伺服器的Discord資料
 * @param {guildInfo.GuildInformation} element 該伺服器的資訊
 * @param {number} page 頁數
 * @param {number} pageShowHax 單頁上限 
 * @returns 包含排名的Discord.MessageEmbed
 */
function reactionsShow(guild, element, page, pageShowHax){
    //#region 等級排行顯示清單 
    let levelembed = new Discord.MessageEmbed()
        .setTitle(`${guild.name} 的專屬伺服器反映`)
        .setColor(process.env.EMBEDCOLOR)                                
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`)
        .setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.reactionsMuch)}` + 
        ` / #${element.reactionsMuch}`);
    element.reaction.slice(page * pageShowHax, page * pageShowHax + pageShowHax).forEach(element => {
        if(element) levelembed.addField(`ID: ${element.id}`, `訊息：${element.react}\n回覆：${element.reply}`, true);
    })

    return levelembed;
}