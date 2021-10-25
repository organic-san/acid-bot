const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { chooseFormat } = require('ytdl-core');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guess-number')
        .setDescription('來猜個數字吧!')
        .addNumberOption(opt => 
            opt.setName('range')
            .setDescription('選擇數字的範圍')
            .addChoice('4種', 4)
            .addChoice('6種', 6)
            .addChoice('8種', 8)
            .addChoice('10種', 10)
            .setRequired(true)
        ).addBooleanOption(opt => 
            opt.setName('is-recurring')
            .setDescription('同一個數字是否重複出現')
            .setRequired(true)
        ),
    tag: "interaction",
    
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        await interaction.deferReply();
        const range = interaction.options.getNumber('range');
        const recurring = interaction.options.getBoolean('is-recurring');
        let answer = [];
        let defaultList = [];
        for(let i = 1; i <= range; i++) defaultList.push(i);
        if(range === 10) defaultList[defaultList.length - 1] = 0;
        let turn = range + 2;
        for(let i = 0; i < 4; i++){
            if(recurring) answer.push(Math.floor(Math.random() * range + 1));
            else {
                const rdCode = Math.floor(Math.random() * defaultList.length);
                answer.push(defaultList[rdCode]);
                defaultList.splice(rdCode, 1);
            }
        }
        let row = await rowCreate(range, recurring, []);
        const msg = await interaction.editReply({
            content: `來玩猜數字吧! 我會想一個四位數字，你要想辦法在到數結束內猜到! \n玩家: ${interaction.user}  / 模式: ${recurring ? "會重複數字" : "不會重複數字"}`, 
            components: row, 
            fetchReply: true
        });
        const collector = msg.createMessageComponentCollector({time: 6 * 1000 });
        let guess = [];
        let guessd = [[]];
        let content = "";
        collector.on('collect', async i => {
            if(i.user.id !== interaction.user.id) return i.reply({content: "想參與遊戲可以用/guess-number開始喔!", ephemeral: true});
            if(!Number.isNaN(parseInt(i.customId)) || i.customId === "delete") {
                if(!Number.isNaN(parseInt(i.customId))) guess.push(parseInt(i.customId));
                else guess.pop(parseInt(i.customId));
                let row = await rowCreate(range, recurring, guess);
                
                await i.update({
                    content: `來玩猜數字吧!\n玩家: ${interaction.user} / 模式: ${recurring ? "會重複數字" : "不會重複數字"}\n` + 
                    `剩餘回合數: \`${turn}\`\n\`\`\`\n` + 
                        `${content + `目前猜測: ${[...guess].join(" ").padEnd(4, ' ')}`}\n\`\`\``, 
                    components: row
                });   
            } else if(i.customId === "complete") {

                guessd[range + 2 - turn] = [...guess];
                let copyans = [...answer];
                let copygus = [...guess];
                let a = 0;
                let b = 0;
                copygus.forEach((v2, i2) => {
                    if(v2 === copyans[i2]){
                        a++;
                        copyans[i2] = -1;
                        copygus[i2] = i2 * 100;
                    }
                })
                copygus.forEach((v2, i2) => {
                    if(copyans.includes(v2)){
                        b++;
                        copyans[copyans.findIndex(v => v === v2)] = -1;
                        copygus[i2] = i2 * 100;
                    }
                })
                guessd[range + 2 - turn][guessd[range + 2 - turn].length] = (a + "A" + b + "B");
                content += `第 ${(guessd.length).toString().padStart(2, '0')} 次嘗試: ${[...guessd[range + 2 - turn]].join(" ")}\n`
                turn--;
                if(guess.join("") === answer.join("")){
                    await i.update({
                        content: `恭喜猜對了!\n玩家: ${interaction.user} / 模式: ${recurring ? "會重複數字" : "不會重複數字"}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                        `\n成功!\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                        components: []
                    });
                    collector.stop();
                } else if(turn > 0) {
                    guess = [];
                    let row = await rowCreate(range, recurring, guess);
                    await i.update({
                        content: `來玩猜數字吧!\n玩家: ${interaction.user} / 模式: ${recurring ? "會重複數字" : "不會重複數字"}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}\n\`\`\``, 
                        components: row
                    });
                } else {
                    await i.update({
                        content: `挑戰失敗!\n玩家: ${interaction.user} / 模式: ${recurring ? "會重複數字" : "不會重複數字"}\n` + 
                        `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                        `\n失敗!\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                        components: []
                    });
                }
            }
        });

        collector.on('end', (c, r) => {
            if(r !== "messageDelete" && r !== "user"){
                interaction.editReply({
                    content: `玩家選擇放棄了!\n玩家: ${interaction.user} / 模式: ${recurring ? "會重複數字" : "不會重複數字"}\n` + 
                    `剩餘回合數: \`${turn}\`\n\`\`\`\n${content}` + 
                    `\n失敗!\n我所想的數字: ${answer.join(" ")}\`\`\``, 
                    components: []
                });
            }
        });

    }
};

/**
 * 回傳按鈕
 * @param {number} range
 * @param {boolean} recurring
 * @param {Array<number} choose
 * @returns 
 */
async function rowCreate(range, recurring, choose) {
    if(range === 4) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('取消一格')
                        .setCustomId('delete')
                        .setStyle('PRIMARY')
                        .setDisabled(choose.length >= 1 ? false : true),
                        new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 6) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('取消一格')
                        .setCustomId('delete')
                        .setStyle('PRIMARY')
                        .setDisabled(choose.length >= 1 ? false : true),
                    new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 8) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('7')
                        .setCustomId('7')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(7)) || choose.length > 3 ? true : false),
                        new Discord.MessageButton()
                        .setLabel('8')
                        .setCustomId('8')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(8)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('取消一格')
                        .setCustomId('delete')
                        .setStyle('PRIMARY')
                        .setDisabled(choose.length >= 1 ? false : true),
                        new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }else if(range === 10) {
        return [
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('1')
                        .setCustomId('1')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(1)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('2')
                        .setCustomId('2')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(2)) || choose.length > 3 ? true : false),
                        new Discord.MessageButton()
                        .setLabel('3')
                        .setCustomId('3')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(3)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('4')
                        .setCustomId('4')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(4)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('5')
                        .setCustomId('5')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(5)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('6')
                        .setCustomId('6')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(6)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('7')
                        .setCustomId('7')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(7)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('8')
                        .setCustomId('8')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(8)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('9')
                        .setCustomId('9')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(9)) || choose.length > 3 ? true : false),
            ]), 
            new Discord.MessageActionRow()
                .addComponents([
                    new Discord.MessageButton()
                        .setLabel('取消')
                        .setCustomId('delete')
                        .setStyle('PRIMARY')
                        .setDisabled(choose.length >= 1 ? false : true),
                    new Discord.MessageButton()
                        .setLabel('0')
                        .setCustomId('0')
                        .setStyle('SECONDARY')
                        .setDisabled((!recurring && choose.includes(0)) || choose.length > 3 ? true : false),
                    new Discord.MessageButton()
                        .setLabel('決定')
                        .setCustomId('complete')
                        .setStyle('SUCCESS')
                        .setDisabled(choose.length > 3 ? false : true),
                ])
        ];
    }
}