const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../JSmodule/guildInformationClass');
const textCommand = require('../JSmodule/textModule');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('levels')
        .setDescription('與等級系統相關的指令')
        .addSubcommand(opt =>
            opt.setName('rank')
            .setDescription('查看等級')
            .addUserOption(opt => 
                opt.setName('user')
                .setDescription('要查看的對象')
            )
        )
        .addSubcommand(opt =>
            opt.setName('ranking')
            .setDescription('查看等級排行')
        ).addSubcommand(opt => 
            opt.setName('no-dm')
            .setDescription('停用/啟用機器人私訊升等訊息')
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {
        if(!(interaction.guild.members.cache.get((interaction.options.getUser('user') ?? interaction.user).id))) 
            return interaction.reply({content: "我沒辦法在這個伺服器中找到他。", ephemeral:true});
        if (interaction.options.getSubcommand() === 'rank') {

            const user = interaction.options.getUser('user') ?? interaction.user;
            
            if(user.bot) return interaction.reply({content: "哎呀！機器人並不適用等級系統！", ephemeral: true});
            if(!guildInformation.levels) return interaction.reply({content: "哎呀！這個伺服器並沒有開啟等級系統！", ephemeral: true});

            else{
                var a = 0;
                let embed = new Discord.MessageEmbed().setColor(process.env.EMBEDCOLOR);
                let exps = 0;
                let lvls = 0;
                let levelsList = [];
                guildInformation.users.forEach((item) => {
                    levelsList.push(item.exp);
                    if(item.id === user.id){
                        a++;
                        let nextlevel = Math.ceil((textCommand.levelUpCalc(item.levels)) * textCommand.avgLevelPoint);
                        let backlevel = Math.min(Math.ceil((textCommand.levelUpCalc(item.levels - 1)) * textCommand.avgLevelPoint), item.exp);
                        if(item.levels === 0){backlevel = 0};
                        exps = item.exp;
                        lvls = item.levels;

                        let rankBar = "";
                        let firstMark = "🟨";
                        const secondMark = "🟪";
                        const Barlength = 20;
                        const persent = Math.ceil((exps - backlevel) / (nextlevel - backlevel) * Barlength - 0.5);
                        for(let i = 0; i < Barlength; i++){
                            if(i === persent){firstMark = secondMark;}
                            rankBar += firstMark;
                        }
                        embed.addField(`${exps - backlevel} / ${nextlevel - backlevel} exp. to next level`, rankBar, true)
                            .setFooter(`total: ${item.exp} exp. ${item.msgs} message(s). `/*${item.chips} chip(s)*/)
                            //TODO: 在未來有金錢系統後記得改掉這裡的顯示，讓chips顯示
                    }
                });
                if(a === 0){
                    interaction.reply({content: `看來 ${user} 還沒發送在這伺服器的第一則訊息。`, ephemeral: true});
                }else{
                    levelsList.sort(function(a, b) {return b - a;});
                    let rankshow = `\n🔹 RANK: #${levelsList.indexOf(exps) + 1} 🔹 LEVEL: ${lvls} 🔹`;
                    if(interaction.guild.members.cache.get(user.id).nickname){
                        embed.setAuthor(`${interaction.guild.members.cache.get(user.id).nickname} (${user.tag}) ${rankshow}`, user.displayAvatarURL({dynamic: true}));
                    }else{
                        embed.setAuthor(`${user.tag} ${rankshow}`, user.displayAvatarURL({dynamic: true}));
                    }
                    interaction.reply({embeds: [embed]});
                }
            }

        } else if(interaction.options.getSubcommand() === 'ranking') {

            const pageShowHax = 20;
            let page = 0;
            guildInformation.sortUser();
            const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
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
            const msg = interaction.editReply({embeds: [levels], components: [row]});
            //TODO: 等哪天能直接從interaction.reply抓訊息再來改這裡

            const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot && i.message.id === msg.id;
            const collector = interaction.channel.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if (i.customId === '下一頁') 
                    if(page * pageShowHax + pageShowHax < guildInformation.usersMuch) page++;
                if(i.customId === '上一頁')
                    if(page > 0) page--;
                guildInformation.sortUser();
                const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
                i.update({embeds: [levels], components: [row]});
                collector.resetTimer({ time: 60 * 1000 });
            });
            
            collector.on('end', (c, r) => {
                if(r !== "messageDelete"){
                    const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
                    interaction.editReply({embeds: [levels], components: []})
                }
            });
            
        } else if(interaction.options.getSubcommand() === 'no-dm') {
            
            const item = guildInformation.getUser(interaction.user.id);
            if(item.DM !== true){
                item.DM = true;
                interaction.reply({content: `已開啟你在 **${interaction.guild.name}** 的私訊升等通知。`, ephemeral: true})
                    .catch(() => item.DM = false);
            }else{
                item.DM = false;
                interaction.reply({content: `已關閉你在 **${interaction.guild.name}** 的私訊升等通知。`, ephemeral: true})
                    .catch(() => item.DM = false);
            }
        }
	},
};

/**
 * 顯示整個伺服器的經驗值排名
 * @param {Discord.Guild} guild 該伺服器的Discord資料
 * @param {guild.GuildInformation} element 該伺服器的資訊
 * @param {number} page 頁數
 * @param {number} pageShowHax 單頁上限 
 * @returns 包含排名的Discord.MessageEmbed
 */
function levelsEmbed(guild, element, page, pageShowHax){
    //#region 等級排行顯示清單
    let levelembed = new Discord.MessageEmbed()
        .setTitle(`${guild.name} 的等級排行`)
        .setColor(process.env.EMBEDCOLOR)                                
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`);

    let ebmsgrk = "";
    let ebmsgname = "";
    let ebmsgexp = "";
    for(let i = page * pageShowHax; i < Math.min(page * pageShowHax + pageShowHax, element.users.length); i++){
        let nametag = new String(element.users[i].tag);
        if(nametag.length > 20){nametag = nametag.substring(0,20) + `...`;}
        ebmsgrk += `#${i + 1} \n`;
        ebmsgname += `${nametag}\n`
        ebmsgexp += `${element.users[i].exp} exp. (lv.${element.users[i].levels})\n`;
    }
    levelembed.setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.users.length)}` + 
        ` / #${element.users.length}`);
    levelembed.addField("rank", ebmsgrk, true);
    levelembed.addField("name", ebmsgname, true);
    levelembed.addField("exp.", ebmsgexp, true);

    return levelembed;
}