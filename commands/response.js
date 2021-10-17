const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('response')
        .setDescription('給你一點溫馨的反應')
        .addSubcommand(opt =>
            opt.setName('happybeam')
            .setDescription('快樂光線(/  ≧▽≦)/=====)')
        ).addSubcommand(opt =>
            opt.setName('goodnight')
            .setDescription('晚安~')
        ).addSubcommand(opt => 
            opt.setName('up-crazy-night')
            .setDescription('向上發射龜雞奶')
            .addIntegerOption(opt => 
                opt.setName('floor')
                    .setDescription('所要發射的高度(樓層)')
                    .setRequired(true)
            )
        ).addSubcommand(opt => 
            opt.setName('fat-nerd-style-generator')
            .setDescription('肥宅文體產生器')
            .addStringOption(opt => 
                opt.setName('text')
                    .setDescription('要轉換的內文，空格會視為換行')
                    .setRequired(true)
            )
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
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
        } else if(interaction.options.getSubcommand() === 'up-crazy-night') {
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

        } else if(interaction.options.getSubcommand() === 'fat-nerd-style-generator') {
            if(!interaction.channel.permissionsFor(interaction.client.user).has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS))
                return interaction.reply({content: "請先賦予我管理webhook的權限!", ephemeral: true});
            if(interaction.channel.isThread()) return interaction.reply({content: "不能在討論串中使用本功能!", ephemeral: true});

            const text = interaction.options.getString('text');
            let splitText = text.split(/\s+/);
            
            splitText.forEach((content, index) => {
                const rnd10 = Math.floor(Math.random() * 10);
                if(Math.floor(Math.random() * 3) <= 1) 
                    splitText[index] = splitText[index].padEnd(splitText[index].length + Math.floor(Math.random() * 6), 'w');
                if(rnd10 <= 1) {
                    splitText[index] += darklize_postfix[Math.floor(Math.random() * darklize_postfix.length)];
                } else if(rnd10 < 8){
                    splitText[index] += postfix[Math.floor(Math.random() * postfix.length)];
                }
            })
            if(Math.floor(Math.random() * 3) <= 0) 
                splitText.push(part_postfix[Math.floor(Math.random() * part_postfix.length)]);
            if(Math.floor(Math.random() * 3) <= 0) 
                splitText.unshift(part_prefix[Math.floor(Math.random() * part_prefix.length)]);
            const content = splitText.join("\n");

            const webhooks = await interaction.channel.fetchWebhooks();
            let webhook = webhooks.find(webhook => webhook.owner.id === interaction.client.user.id);
            if(!webhook) {
                webhook = await interaction.channel.createWebhook(interaction.member.displayName, {
                    avatar: interaction.user.displayAvatarURL({dynamic: true})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }else{
                webhook.edit({
                    name: interaction.member.displayName,
                    avatar: interaction.user.displayAvatarURL({dynamic: true})
                })
                    .then(webhook => webhook.send({content: content, allowedMentions: {repliedUser: false}}))
                    .catch(console.error);
            }
            interaction.reply({content: "已發送!", ephemeral: true})
        }

	},
};

const postfix = [
    " (笑",
    " (燦笑",
    " (推眼鏡",
    " (茶",
    " (菸",
    " (歪頭",
    " (汗顏",
    " (？",
    " (ㄏㄏ",
    " (喂！",
    " (搔頭",
    " (嘆",
    " (扶額",
    " (星爆",
    " (笑死",
    " (無駄",
    "= =",
    "peko",
    "",
    "",
    ""
]

const part_prefix = [
    "嘛",
    "那個",
    "大家好",
    "安安 是這樣的",
    "我覺得呢",
    "小妹我說一下"
]

const part_postfix = [
    "你們覺得呢?",
    "哈哈",
    "討論一下吧",
    "揪咪",
    "不是沒有原因的",
    "我很好奇",
    "呀咧呀咧"
]

const darklize_postfix = [
    " (黑化",
    " (射精",
    " (勃起",
    " (gay",
    " (語彙力",
    " (憤怒",
    " (憤怒槌牆",
    " (翻白眼"
]