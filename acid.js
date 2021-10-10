const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const prefix = require('./JSONHome/prefix.json');
const characters = require("./data/characters/testEnglishCharacters.json")

const music = require('./JSmodule/musicModule');
const textCommand = require('./JSmodule/textModule');
const musicbase = require('./JSmodule/musicListClass');
const guild = require('./JSmodule/guildInformationClass');
const abyss = require('./JSmodule/abyssModule');

const fs = require('fs');
const { connect } = require('http2');
require('dotenv').config();

const options = {
    restTimeOffset: 100,
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MEMBERS, 
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES, 
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
};

const client = new Discord.Client(options);
client.login(process.env.DCKEY_TOKEN);

let guildInformation = new guild.GuildInformationArray([], []); //所有資料的中樞(會將檔案的資料撈出來放這裡)
let isReady = false;

let numberingList = new Map();

let musicList = new Map();

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// 連上線時的事件
//#region 連線事件
client.on('ready', () =>{
    time = client.readyAt;
    month = time.getMonth() + 1;
    date = time.getDate();
    hours = time.getHours();
    minutes = time.getMinutes();
    sec = time.getSeconds();
    if(month < 10){month = '0' + month;}
    if(date < 10){date = '0' + date;}
    if(hours < 10){hours = '0' + hours;}
    if(minutes < 10){minutes = '0' + minutes;}
    if(sec < 10){sec = '0' + sec;}
    console.log(`登入成功: ${client.user.tag} 於 ${month}/${date} ${hours}:${minutes}:${sec}`);
    client.user.setActivity('%help'/*, { type: 'PLAYING' }*/);

    fs.readFile("./data/guildInfo/guildlist.json", (err,word) => {
        if(err) throw err;
        var parseJsonlist = JSON.parse(word);
        parseJsonlist.forEach(element => {
            guildInformation.pushGuildList(element);
        });
        guildInformation.sortGuildList();
        parseJsonlist.forEach(async (element) => {
            const filename = `./data/guildInfo/${element}.json`;
            fs.readFile(filename, async (err, text) => {
                if (err)
                    throw err;
                
                const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
                guildInformation.pushGuildInfo(
                    await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
                );
                guildInformation.getGuild(element).sortUser();
            });
        });
    });
    setTimeout(() => {
        console.log(`設定成功: ${new Date(Date.now())}`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`登入成功: ${time}`));
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => channel.send(`登入成功: ${time}`));
        isReady = true;
    }, 2000);
    setInterval(() => {
        fs.writeFile("./data/guildInfo/guildlist.json", JSON.stringify(guildInformation.guildList, null, '\t'), function (err){
            if (err)
                console.log(err);
        });
        guildInformation.guilds.forEach(async (element) => {
            const filename = `./data/guildInfo/${element.id}.json`;
            fs.writeFile(filename, JSON.stringify(element, null, '\t'),async function (err) {
                if (err)
                    return console.log(err);
            });
        });
        time = new Date(Date.now());
        console.log(`Saved in ${time}`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`自動存檔: ${time}`)).catch(err => console.log(err));
    },10 * 60 * 1000)
});
//#endregion

client.on('interactionCreate', async interaction => {

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");

    if(!guildInformation.has(interaction.guild.id)){
        const thisGI = new guild.GuildInformation(interaction.guild, []);
        guildInformation.addGuild(thisGI);
        console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`)
        );
    }
    guildInformation.updateGuild(interaction.guild);

    if (!interaction.isCommand()) return;
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId)
	const command = client.commands.get(interaction.commandName);

    //#region 等級系統
    const element = guildInformation.getGuild(interaction.guild.id);
    if(element.levels){
        if(!element.has(interaction.user.id)){
            const newuser = new guild.User(interaction.user.id, interaction.user.tag);
            element.addUser(newuser);
            console.log(`在 ${interaction.guild.name} (${interaction.guild.id}) 添加用戶進入等級系統: ${interaction.user.tag} (${interaction.user.id})`);
            client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
                channel.send(`在 **${interaction.guild.name}** (${interaction.guild.id}) 添加用戶進入等級系統: ${interaction.user.tag} (${interaction.user.id})`)
            );
        }else{
            element.getUser(interaction.user.id).tag = interaction.user.tag;
            const lvup = element.getUser(interaction.user.id).addexp(Math.floor(Math.random() * 6) + 10, true);
            if(lvup) element.sendLevelsUpMessage(interaction.user, interaction.channel, interaction.guild, '/');
        }
    }
    //#endregion

	if (!command) return;

    if(!musicList.has(interaction.guild.id)){
        musicList.set(interaction.guild.id, new musicbase.MusicList(interaction.client.user, interaction.guild, []));
    }

	try {
        if(command.tag === "interaction") await command.execute(interaction);
		if(command.tag === "guildInfo") await command.execute(interaction, guildInformation.getGuild(interaction.guild.id));
		if(command.tag === "musicList") await command.execute(interaction, musicList.get(interaction.guild.id));

	} catch (error) {
		console.error(error);
		await interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true });
	}
});

// 當 Bot 接收到訊息時的事件
//#region 文字事件反應
client.on('messageCreate', async msg =>{
    try{
        if(!isReady) return;
        if(!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊)
        if(msg.channel.type === "DM") return; 
        if(msg.webhookId) return;

        if(!guildInformation.has(msg.guild.id)){
            const thisGI = new guild.GuildInformation(msg.guild, []);
            guildInformation.addGuild(thisGI);
            console.log(`${client.user.tag} 加入了 ${msg.guild.name} (${msg.guild.id}) (缺少伺服器資料觸發/message)`);
            client.channels.fetch(process.env.CHECK_CH_ID)
                .then(channel => channel.send(`${client.user.tag} 加入了 **${msg.guild.name}** (${msg.guild.id}) (缺少伺服器資料觸發/message)`));
        }
        guildInformation.updateGuild(msg.guild);

        if(!msg.member.user) return; //幫bot值多拉一層，判斷上層物件是否存在
        if(msg.member.user.bot){ return;} //訊息內bot值為正 = 此消息為bot發送
    }catch (err){
        return;
    }
    
    try{
        const splitText = /\s+/;

        var defpre = prefix[0].Value;
        var defprem = prefix[2].Value;
        var defprea = prefix[4].Value;

        //#region 等級系統
        const element = guildInformation.getGuild(msg.guild.id);
        if(element.levels){
            if(!element.has(msg.author.id)){
                const newuser = new guild.User(msg.author.id, msg.author.tag);
                element.addUser(newuser);
                console.log(`在 ${msg.guild.name} (${msg.guild.id}) 添加用戶進入等級系統: ${msg.author.tag} (${msg.author.id})`);
                client.channels.fetch(process.env.CHECK_CH_ID)
                    .then(channel => channel.send(`在 **${msg.guild.name}** (${msg.guild.id}) 添加用戶進入等級系統: ${msg.author.tag} (${msg.author.id})`));
            }else{
                element.getUser(msg.author.id).tag = msg.author.tag;
                const lvup = element.getUser(msg.author.id).addexp(Math.floor(Math.random() * 6) + 10, true);
                if(lvup) element.sendLevelsUpMessage(msg.author, msg.channel, msg.guild, defpre);
            }
        }
        //#endregion

        if(!msg.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.ADD_REACTIONS))   
            return console.log("isCommand: reactless");

        //#region 幫文字加上表情符號
        if (msg.content === '成功' || msg.content === '成功!' || msg.content === '成功！' ||
        msg.content === '成功了' || msg.content === '成功了!' || msg.content === '成功了！'){
            msg.react('🎉');
        }

        if (msg.content === '龜雞奶'){
            msg.react('🐢');
            msg.react('🐔');
            msg.react('🥛');
        }

        if (msg.content.includes('上龜雞奶') && msg.content.includes('樓')){
            const regex = /上/g;

            if(msg.content.match(regex).length <= 100){
                const beforeMessage = await msg.channel.messages.fetch({ before: msg.id, limit: msg.content.match(regex).length })
                .then(messages => messages.last())
                .catch(console.error)

                if(beforeMessage){
                    if(!beforeMessage.deleted){beforeMessage.react('🐢');
                        if(!beforeMessage.deleted){beforeMessage.react('🐔');}
                        if(!beforeMessage.deleted){beforeMessage.react('🥛');}
                    }else{
                        if(!msg.deleted){
                                msg.react('😢');
                        }
                    }
            }
            }else{
                if(!msg.deleted){
                    msg.react('😢');
                }
            }
        }

        if (msg.content.includes('下龜雞奶') && msg.content.includes('樓')){
            const regex = /下/g;

            if(msg.content.match(regex).length <= 100){
                const collected = await msg.channel.awaitMessages({
                    max: msg.content.match(regex).length, time: 30 * 60 * 1000 
                });
                const responser = collected.last();

                if(responser !== undefined){
                    responser.react('🐢');
                    if(!responser.deleted){ responser.react('🐔');}
                    if(!responser.deleted){ responser.react('🥛');}
                }else{
                    if(!msg.deleted){
                        msg.react('😢');
                    }
                }
            }else{
                if(!msg.deleted){
                    msg.react('😢');
                }
            }
        }
        //#endregion

        if(!msg.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.SEND_MESSAGES)) 
            return console.log("isCommand: sendless");
        
        //#region 前輟定義與發送isCommand確認、機器人自動回應
        var isCommand = false;

        const prefixED = Object.keys(prefix); //前綴符號定義
        let tempPrefix = prefixED.findIndex(element => prefix[element].Value === msg.content.substring(0, prefix[element].Value.length));

        if(tempPrefix >= 0){  isCommand = true; }

        if(isCommand){
            const key = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText);
            console.log("isCommand: " + isCommand + ": " + prefix[tempPrefix].Value + key[0]);
        }else{
            const isReaction = guildInformation.getGuild(msg.guild.id).findReaction(msg.content);
            if(isReaction >= 0) {
                await msg.channel.sendTyping();
                msg.channel.send(guildInformation.getGuild(msg.guild.id).getReaction(isReaction));
                console.log("isCommand: " + isCommand + ": isReaction");
            }
        }
        //#endregion

        //#region 特殊文字判定回應 笑死 晚安 快樂光線
        switch(msg.content){
            case '笑死':
                await msg.channel.sendTyping();
                let message = '';
                for(step = 0; step < (Math.floor(Math.random()*3 + 2)); step++){
                    message = message + 'w';
                }
                message = message + '草';
                for(step = 0; step < (Math.floor(Math.random()*4 + 3)); step++){
                    message = message + 'w';
                }
                if(Math.floor(Math.random()*7) === 0){message = '( ﾟ∀ﾟ)ｱﾊﾊ八八ﾉヽﾉヽﾉヽﾉ ＼ / ＼/ ＼';}
                if(Math.floor(Math.random()*25) === 0){message = '草';}
                if(Math.floor(Math.random()*50) === 0){message = '你...找到了...隱藏的文字！(然而沒有意義)';}
                msg.channel.send(message);
                break;

            case '晚安':
            case '晚ㄢ':
                await msg.channel.sendTyping();
                switch(Math.floor(Math.random()*2)){
                    case 0:
                        msg.reply("今夜有個好夢 ( ˘ω˘ )睡…");
                        break;
                    case 1:
                        msg.reply("+｡:.゜晚安ヽ(´∀`)ﾉ .:｡+゜｡");
                        break;
                }
                break;
            
            case '快樂光線':
            case 'happybeam':
            case 'happy beam':
            case 'happylight':
            case 'happy light':
                await msg.channel.sendTyping();
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
                msg.reply(text);
                break;

            case '我要加入':
                if(msg.channel.id === "851841312360890369"){
                    msg.guild.members.cache.get(msg.author.id).roles.add('848903846990577674');
                    msg.delete();
                }
        }
        //#endregion

        //#region 數數字part1
        if(parseInt(msg.content) === parseInt(msg.content) && numberingList.get(msg.channel.id) !== undefined){
            numberingList.set(msg.channel.id, numberingList.get(msg.channel.id) + 1);
            if(parseInt(msg.content) === (numberingList.get(msg.channel.id))){
                msg.react('✅');
            }else{
                msg.react('❌');
                msg.channel.send(`數數字結束！成績：${numberingList.get(msg.channel.id) - 1}`);
                numberingList.delete(msg.channel.id);
            }
        }
        //#endregion

        //#region 群外表情符號代為顯示功能
        const member = await msg.guild.members.fetch(client.user.id);
        if(member.permissions.has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS)){
            if(!msg.channel.isThread()){
                const notEmoji = msg.content.split(/:\w+:/);
                const isEmoji = [...msg.content.matchAll(/:\w+:/g)];
                isEmoji.forEach((v, i) => isEmoji[i] = v[0]);
                let isEmojiChanged = false;

                if(isEmoji.length > 0) {
                    isEmoji.forEach((emoji, index) => {
                        if(!emoji) return;
                        if(notEmoji[index].endsWith('<')) return;
                        if(notEmoji[index].endsWith('<a')) return;
                        let find = client.emojis.cache.find(e => e.name === emoji.slice(1, emoji.length - 1));
                        if(!find) find = client.emojis.cache.find(e => e.name.includes(emoji.slice(1, emoji.length - 1)));
                        if(find) {
                            if(find.guild.id !== msg.guild.id || find.animated){
                                isEmojiChanged = true;
                                isEmoji[index] = find.toString();
                            }
                        }
                    })
    
                    if(isEmojiChanged){
                        console.log("isCommand: " + isCommand + ": isEmojiWebhook");
    
                        let words = [];
                        for(let i = 0; i < notEmoji.length * 2 - 1; i++)
                            i % 2 ? words.push(isEmoji[(i-1)/2]) : words.push(notEmoji[i/2]);
                        words = words.join("");
    
                        const webhooks = await msg.channel.fetchWebhooks();
                        let webhook = webhooks.find(webhook => webhook.owner.id === client.user.id);
                        if(!webhook) {
                            webhook = await msg.channel.createWebhook(msg.member.displayName, {
                                avatar: msg.author.displayAvatarURL({dynamic: true})
                            })
                        }
                        if(!msg.deleted && msg.deletable) msg.delete().catch((err) => console.log(err));
                        
                        webhook.edit({
                            name: msg.member.displayName,
                            avatar: msg.author.displayAvatarURL({dynamic: true})
                        })
                            .then(webhook => webhook.send(words))
                            .catch(console.error);
                    } else console.log("isCommand: " + isCommand);
                } else console.log("isCommand: " + isCommand);
            }
        }
        //#endregion

        //實作
        //以下預計廢除
        switch(tempPrefix.toString()){
            case '0': //文字回應功能
            case '1':
                //#region 文字指令(全)
                await msg.channel.sendTyping();
                const cmd = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText); //以空白分割前綴以後的字串

                switch (cmd[0]) {
                    case 'ping':
                        msg.channel.send(client.ws.ping + 'ms');
                        break;

                    case '生日':
                    case '我的出生':
                    case '我的生日':
                    case 'birth':
                    case 'birthday':
                    case 'b':
                        //#region 生日
                        iself = 0;
                        if (!msg.mentions.users.size) {
                            msg.mentions.users.set('0', msg.author);
                            iself = 1;
                        }
                        msg.mentions.users.map(user => {
                            msg.channel.send(textCommand.time(user.createdAt, `這是 ${user} 創立帳號的時間`));
                        });
                        break;
                        //#endregion

                    case '現在時間':
                    case '現在時刻':
                    case 'now':
                    case 'n':
                        msg.reply(textCommand.time(msg.createdAt, "這是現在時間"));
                        break;
                    
                    case '計時器':
                    case 'timer':
                    case 't':
                        textCommand.timer(cmd, msg.channel, msg.author, defpre, client.user);
                        break;

                    case '頭像':
                    case '我的頭像':
                    case 'myavatar':
                    case 'avatar':
                    case 'av':
                    case 'ma':
                        //#region 頭像
                        if (!msg.mentions.users.size) {
                            msg.mentions.users.set('0',msg.author);
                        }
                        msg.mentions.users.map(user => {
                            const embed = new Discord.MessageEmbed()
                                .setColor(process.env.EMBEDCOLOR)
                                .setDescription(`這是 ${user.tag} 的頭像網址`)
                                .addField("頭像網址(2048×2048)", user.displayAvatarURL({dynamic: true, format: "png", size: 2048}))
                                .addField("頭像網址(256×256)", user.displayAvatarURL({dynamic: true, format: "png", size: 256}))
                                .setThumbnail(`${user.displayAvatarURL({dynamic: true, format: "png", size: 2048})}`)
                            msg.channel.send({embeds: [embed]});
                        });
                        break;
                        //#endregion
                    
                    case 'numbercount':
                    case '數數字':
                    case 'countnumber':
                    case 'numbering':
                    case 'cn':
                    case 'nc':
                        //#region 數數字part2
                        if(numberingList.get(msg.channel.id) === undefined){
                            msg.channel.send('開始數數字！下一個數字：1');
                            numberingList.set(msg.channel.id, 0);
                        }else{
                            msg.channel.send(`下一個數字：${numberingList.get(msg.channel.id) + 1}`);
                        }
                        break;
                        //#endregion

                    case '骰子':
                    case 'dice':
                    case 'd':
                        msg.reply(textCommand.dice(cmd[1], cmd[2]));
                        break;
                    
                    case '匿名':
                    case '匿名訊息':
                    case 'anonymous':
                    case 'a':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/anonymous)來取代這裡原有的功能!')
                        break;
                    
                    case '猜拳':
                    case 'jyanken':
                        const embedhelp2 = new Discord.MessageEmbed()
                                .setColor(process.env.EMBEDCOLOR)
                                .setTimestamp()
                                .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`);
                        msg.channel.send({embeds: [textCommand.helpJyanken(defpre, embedhelp2)]});
                        break;

                    case '剪刀':
                    case '石頭':
                    case '布':
                    case 'scissors':
                    case 'stone':
                    case 'paper':
                        textCommand.jyanken(cmd, msg, client.user);
                        break;

                    case 'happybirthday':
                    case 'hbd':
                    case 'HBD':
                    case '生日快樂':
                        //#region 生日快樂歌
                        if (!msg.mentions.users.size) {
                            const embedhelp3 = new Discord.MessageEmbed()
                                .setColor(process.env.EMBEDCOLOR)
                                .setTimestamp()
                                .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`);
                            msg.channel.send({embeds: [textCommand.helpHBD(defpre, embedhelp3)]});
                        }
                        msg.mentions.users.map(user => {
                            msg.channel.send(textCommand.HBD(user, msg.channel));
                        });
                        break;
                        //#endregion
                    
                    case 'record':
                    case 'rc':
                    case '紀錄':
                    case '回顧':
                        //#region 紀錄
                        if(!cmd[1]){
                            const embedhelp = new Discord.MessageEmbed()
                                .setColor(process.env.EMBEDCOLOR)
                                .setTimestamp()
                                .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`);
                            return msg.channel.send({embeds: [textCommand.helpRecord(defpre, embedhelp)]});
                        }
                        var ifc = 0;
                        if(cmd[1].split('-').length !== 1 ){
                            var channelrc = textCommand.ChannelResolveFromMention(client, cmd[1].split('-')[0]);
                            msgID = cmd[1].split('-')[1]; ifc = 1;
                        }else if(cmd[2]){
                            var channelrc = textCommand.ChannelResolveFromMention(client, cmd[1]);
                            msgID = cmd[2]; ifc = 1;
                        }else { var channelrc = msg.channel; msgID = cmd[1];};
                        if(!channelrc) return msg.reply("找不到這個頻道:(");
                        if(!channelrc.isText()) return msg.reply("這頻道不是文字頻道:(");
                        channelrc.messages.fetch(msgID).then(async message => 
                            {
                                if(message.author.bot){msg.channel.send("噢，無法記錄機器人的訊息:(");}
                                else{
                                    const fileimage = message.attachments.first();
                                    const embeedrecord = new Discord.MessageEmbed()
                                        .setColor(process.env.EMBEDCOLOR)
                                        .setTimestamp()
                                        .setDescription(message.content)
                                        .setFooter(`${client.user.tag} 記其志於此`, client.user.displayAvatarURL({dynamic: true}))
                                        .addField(`原文`, `[點一下這裡](${message.url})`)
                                    if (fileimage){
                                        if (fileimage.height || fileimage.width)
                                        { embeedrecord.setImage(fileimage.url); }
                                    }
                                    if(ifc){
                                        embeedrecord.setAuthor(`${message.author.tag} 曾經在 #${channelrc.name} 這麼說過：`, 
                                            message.author.displayAvatarURL({dynamic: true}))
                                    }else{
                                        embeedrecord.setAuthor(`${message.author.tag} 曾經這麼說過：`, 
                                            message.author.displayAvatarURL({dynamic: true}))
                                    }
                                    msg.channel.send({embeds: [embeedrecord]});
                                }
                            }
                        ).catch(() => msg.reply("噢，找不到訊息來記錄:("));
                        break;
                        //#endregion
                    
                    case '網址產生器':
                        if(msg.channel.nsfw)
                            return msg.reply("這功能有點危，先撤收，88");

                    case '資訊':
                    case 'info':
                    case 'information':
                    case 'i':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/information)來取代這裡原有的功能!')
                        break;
                    
                    case 'rank':
                    case '等級':
                    case 'r':
                    case 'levels':
                    case '排行':
                    case 'l':
                    case 'noDM':
                    case 'DM':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/levels)來取代這裡原有的功能!')
                        break;
                    
                    case 'poll':
                    case '投票':
                    case 'p':
                    case 'sumpoll':
                    case '統計':
                    case 'sp':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/poll)來取代這裡原有的功能!')
                        break;
                        //#endregion

                    case 'search':
                    case '搜尋':
                    case 's':
                        //TODO: 單字搜尋系統放到textModule
                        if(!cmd[1]) return;
                        let index = characters.findIndex(element => element.character.toLowerCase() === cmd[1].toLowerCase());
                        if(index < 0){index = characters.findIndex(element => element.character.toLowerCase().includes(cmd[1].toLowerCase()));}
                        if(index < 0) return msg.channel.send("找不到");
                        // TODO: 改善搜尋方法，應由完整符合->與開頭符合->與任一部分符合->逐步減少字串長度重複2、3來搜尋
                        msg.channel.send(
                            {content:`單字：${characters[index].character}\n` +
                                `字義：${characters[index].mean}\n` +
                                `等級：${characters[index].rank}`
                            });
                        break;

                    case 'dailycharacters':
                    case '每日單字':
                    case 'dc':
                        //TODO: 美日單字系統放到textModule
                        const charactersMax = cmd[2] ?? 30;
                        const rank = cmd[1] ?? '1-7';
                        const rankset = rank.split('-');
                        if(rankset.length !== 2) return msg.reply('請正確輸入分級需求，例如\`1-6\`。');
                        if(rankset[0] < 1 || rankset[1] > 7 | rankset[0] > rankset[1]) 
                            return msg.reply('無法產生所要求的等級範圍，請將等級設於1~6之間。');
                        const rankdefine = ['第一級', '第二級', '第三級', '第四級', '第五級', '第六級', '附錄'].slice(rankset[0] - 1, rankset[1]);

 
                        const now = new Date(Date.now());
                        let cIndex = cmd[3] ?? now.getDate() * now.getDate() * now.getMonth() * charactersMax + now.getDate();

                        if(parseInt(cmd[2]) > 48) return msg.reply("資料太大！請減少單字要求量。");

                        const embedcharacters = new Discord.MessageEmbed()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTimestamp()
                            .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                            .setTitle(`每日單字 ${cmd[2] ?? 30} 個\n`);
                        const embedcharacters2 = new Discord.MessageEmbed()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTimestamp()
                            .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                        let cList = [];

                        for(let i = 0; i < charactersMax; i++){
                            cIndex = Math.floor(textCommand.seededRandom(cIndex, characters.length - 1));
                            if(cList.includes(characters[cIndex].character)) {i--; cIndex++; continue;}
                            if(!rankdefine.includes(characters[cIndex].rank)) {i--; continue;}

                            cList.push(characters[cIndex].character);
                            if(embedcharacters.fields.length < 24){
                                embedcharacters.addField(`${i + 1}. ${characters[cIndex].character}\n${characters[cIndex].rank}`, 
                                    `||${characters[cIndex].mean.split("; [").join('\n[')}||`, true);
                            }else{
                                embedcharacters2.addField(`${i + 1}. ${characters[cIndex].character}\n${characters[cIndex].rank}`, 
                                    `||${characters[cIndex].mean.split("; [").join('\n[')}||`, true);
                            }
                        }
                        if(embedcharacters2.fields.length > 0){
                            msg.reply({embeds:[embedcharacters, embedcharacters2]});
                        }else{
                            msg.reply({embeds:[embedcharacters]});
                        }
                        break;

                    case 'invite':
                    case '邀請':
                        msg.channel.send({embeds: [textCommand.invite(client.user, msg.channel)]});
                        break;
                    
                    case 'reactions':
                    case '反應':
                    case 'reaction':
                    case 're':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/auto-reply)來取代這裡原有的功能!')
                        break;
                        //#endregion

                    case 'help':
                    case 'h':
                    case '幫助':
                        //#region 幫助清單
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/help)來取代這裡原有的功能!')
                        break;
                        //#endregion
                }
                break;
                //#endregion

            case '2': //音樂指令
            case '3':
                //#region 音樂指令(全)
                await msg.channel.sendTyping();

                if(msg.channel.isThread()){
                    return msg.reply("無法在討論串使用音樂功能喔！");
                }
                
                if(!musicList.has(msg.guild.id)){
                    musicList.set(msg.guild.id, new musicbase.MusicList(client.user, msg.guild, []));
                }
                let content = msg.content.substring(prefix[2].Value.length);
                //contents[0] = 指令,contents[1] = 參數
                const contents = content.split(splitText);
                content = content.substring(contents[0].length + 1);

                switch(contents[0]){
                    case 'play':
                    case '播放':
                    case 'p':
                    case 'replay':
                    case 'rp':
                    case '重播':
                    case 'np':
                    case 'n':
                    case '歌曲資訊':
                    case '資訊':
                    case 'information':
                    case 'i':
                    case 'nowplaying':
                    case 'info':
                    case 'queue':
                    case 'list':
                    case 'q':
                    case '清單':
                    case '列表':
                    case '歌曲清單':
                    case '歌曲列表':
                    case 'stop':
                    case 'pause':
                    case '暫停':
                    case '停止':
                    case 'loop':
                    case 'l':
                    case '循環':
                    case 'repeat':
                    case 'looplist':
                    case 'll':
                    case '清單循環':
                    case 'loopqueue':
                    case 'lq':
                    case 'random':
                    case 'rd':
                    case '隨機':
                    case 'skip':
                    case 's':
                    case '跳歌':
                    case '跳過':
                    case '下一首':
                    case 'next':
                    case '移除':
                    case 'remove':
                    case 'rm':
                    case 'r':
                    case 'clearqueue':
                    case 'clearlist':
                    case 'clear':
                    case '清空清單':
                    case '清空列表':
                    case '清空':
                    case 'cl':
                    case 'cq':
                    case 'c':
                    case 'dc':
                    case 'd':
                    case 'leave':
                    case '退出':
                    case '斷開':
                    case 'disconnect':
                        msg.reply('本指令已棄用。使用斜線指令(/music)以使用相同功能!')
                        break;

                    case 'help':
                    case 'h':
                    case '幫助':
                        //#region 幫助清單
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/help music)來取代這裡原有的功能!')
                        //#endregion
                        break;
                
                }
                break;
                //#endregion

            case '4': //管理指令
            case '5':
                //#region 管理指令(全)
                await msg.channel.sendTyping();

                const commands = msg.content.substring(prefix[4].Value.length).split(splitText); //以空白分割前綴以後的字串
                const filter = message => message.author.id === msg.author.id;
                switch(commands[0]){
                    case 'joinmessage':
                    case 'joinMessage':
                        //#region 群組進出訊息權限管理
                        if (!msg.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)){ 
                            return msg.reply("無法執行指令：權限不足：需要管理員權限");
                        }
                        const element = guildInformation.getGuild(msg.guild.id);
                        if(element.id !== msg.guild.id){return;}
                        switch(commands[1]){
                            //頻道設定
                            case 'channel':
                                msg.channel.send("請選擇要更改設定的部分：\n" +
                                "\`Join\` - 歡迎訊息的頻道\n" +
                                "\`Leave\` - 離去訊息的頻道\n" +
                                "\`JoinAndLeave\` - 同時調整兩邊的頻道\n" +
                                "請直接輸入以上3種關鍵字作為設定，不需要輸入前輟。");
                                const collected1 = await msg.channel.awaitMessages({filter: filter,  max: 1, time: 60 * 1000 });
                                const responser1 = collected1.first();
                                await msg.channel.sendTyping();
                                if (!responser1) return msg.reply(`設定失敗：輸入逾時，請重新設定`);
                                if (!['join', 'leave', 'joinandleave'].includes(responser1.content.toLowerCase())) 
                                    return responser1.reply(`設定失敗：輸入非指定關鍵字，請重新設定`);
                                var take = -1;

                                switch(responser1.content.toLowerCase()){
                                    case 'join':
                                        take = 0;
                                        break;
                                    case 'leave':
                                        take = 1;
                                        break;
                                    case 'joinandleave':
                                        take = 2;
                                        break;
                                }
                                msg.channel.send('請輸入要設定的頻道的ID(例如：123456789012345678)。\n' +
                                '或輸入\`undefined\`將頻道設定為系統訊息頻道。');
                                const collected2 = await msg.channel.awaitMessages({filter: filter, max: 1, time: 60 * 1000 });
                                const responseSC = collected2.first();
                                await msg.channel.sendTyping();
                                if (!responseSC) return responser1.reply(`設定失敗：輸入逾時，請重新設定`);
                                if(responseSC.content.toLowerCase() === "undefined"){
                                    if(take === 0 || take === 2){element.joinChannel = "";}
                                    if(take === 1 || take === 2){element.leaveChannel = "";}
                                }
                                else if(!textCommand.ChannelResolveFromMention(client, responseSC.content)){
                                    return responseSC.reply(`設定失敗：該頻道不存在，請重新設定`);
                                }else if(textCommand.ChannelResolveFromMention(client, responseSC.content).type !== "GUILD_TEXT"){
                                    return responseSC.reply(`設定失敗：該頻道不是文字頻道，請重新設定`);
                                }else{
                                    if(take === 0 || take === 2){element.joinChannel = responseSC.content;}
                                    if(take === 1 || take === 2){element.leaveChannel = responseSC.content;}
                                }
                                if(element.joinChannel === ""){
                                    joinChannel = {"name":undefined, "id":undefined};
                                }else if(!textCommand.ChannelResolveFromMention(client, element.joinChannel)){
                                    joinChannel = {"name":"invalid", "id":"invalid"};
                                }else{joinChannel = textCommand.ChannelResolveFromMention(client, element.joinChannel);}
                                if(element.leaveChannel === ""){
                                    leaveChannel = {"name":undefined, "id":undefined};
                                }else if(!textCommand.ChannelResolveFromMention(client, element.leaveChannel)){
                                    leaveChannel = {"name":"invalid", "id":"invalid"};
                                }else{leaveChannel = textCommand.ChannelResolveFromMention(client, element.leaveChannel);}
                                msg.channel.send(`已更改頻道設定:\n進入訊息頻道名稱: #${joinChannel.name}\n進入訊息頻道ID: ${joinChannel.id}\n` + 
                                `離去訊息頻道名稱: #${leaveChannel.name}\n離去訊息頻道ID: ${leaveChannel.id}`);
                                break;
                            
                            //反轉
                            case 'set':
                                msg.channel.send("請選擇要更改設定的部分：\n" +
                                "\`Join\` - 歡迎訊息的發送設定\n" +
                                "\`Leave\` - 離去訊息的發送設定\n" +
                                "\`JoinAndLeave\` - 同時調整兩邊的設定\n" +
                                "請直接輸入以上3種關鍵字作為設定，不需要輸入前輟。")
                                const collected = await msg.channel.awaitMessages({filter: filter, max: 1, time: 60 * 1000 });
                                const responsera = collected.first();
                                await msg.channel.sendTyping();
                                if (!responsera) return msg.reply(`設定失敗：輸入逾時，請重新設定`);
                                if (!['join', 'leave', 'joinandleave'].includes(responsera.content.toLowerCase())) 
                                    return responsera.reply(`設定失敗：輸入非指定關鍵字，請重新設定`);
                                var take = -1;
                                switch(responsera.content.toLowerCase()){
                                    case 'join':
                                        take = 0;
                                        break;
                                    case 'leave':
                                        take = 1;
                                        break;
                                    case 'joinandleave':
                                        take = 2;
                                        break;
                                }
                                msg.channel.send("請選擇要如何更改：\n" +
                                "\`Open\` - 開啟這項設定\n" +
                                "\`Close\` - 關閉這項設定\n" +
                                "請直接輸入以上2種關鍵字作為設定，不需要輸入前輟。")
                                const collectedb = await msg.channel.awaitMessages({filter: filter, max: 1, time: 60 * 1000 });
                                const responserab = collectedb.first();
                                await msg.channel.sendTyping();
                                if (!responserab) return responsera.reply(`設定失敗：輸入逾時，請重新設定`);
                                if (!['open', 'close'].includes(responserab.content.toLowerCase())) 
                                    return responserab.reply(`設定失敗：輸入非指定關鍵字，請重新設定`);
                                if(responserab.content.toLowerCase() === 'open'){
                                    if(take === 0 || take === 2){element.joinMessage = true;}
                                    if(take === 1 || take === 2){element.leaveMessage = true;}
                                }else{
                                    if(take === 0 || take === 2){element.joinMessage = false;}
                                    if(take === 1 || take === 2){element.leaveMessage = false;}
                                }
                                msg.channel.send(`已更改設定狀態。\n現在是：\n進入狀態：${element.joinMessage}\n` + 
                                `離開狀態：${element.leaveMessage}`);
                                break;

                            case 'message':
                                msg.channel.send("請直接輸入想要設定的歡迎訊息，例如： \`進入前請先閱讀公告!\` 或者輸入 \`undefined\` 即可清除設定。\n" + 
                                    "實際運作時將如下顯示：\n\n" + 
                                    "<@用戶> ，歡迎來到 **<您的伺服器名稱>** !\n" + 
                                    "進入前請先閱讀公告!\n\n" + 
                                    "目前的設定是：" + element.joinMessageContent + "，請輸入所要設定的文字：")
                                const collectedMessage = await msg.channel.awaitMessages({filter: filter, max: 1, time: 60 * 1000 });
                                const responserMessage = collectedMessage.first();
                                await msg.channel.sendTyping();
                                if(responserMessage.content.toLowerCase() === "undefined")
                                element.joinMessageContent = "";
                                else
                                    element.joinMessageContent = responserMessage.content;
                                msg.channel.send(`已更改設定狀態。\n現在是：\n進入狀態：${element.joinMessage}\n` + 
                                `離開狀態：${element.leaveMessage}\n進入訊息：${element.joinMessageContent}`);
                                break;

                            default:
                                //顯示
                                if(element.joinChannel === ""){
                                    joinChannel = {"name":undefined, "id":undefined};
                                }else if(!textCommand.ChannelResolveFromMention(client, element.joinChannel)){
                                    joinChannel = {"name":"invalid", "id":"invalid"};
                                }else{joinChannel = textCommand.ChannelResolveFromMention(client, element.joinChannel);}
                                if(element.leaveChannel === ""){
                                    leaveChannel = {"name":undefined, "id":undefined};
                                }else if(!textCommand.ChannelResolveFromMention(client, element.leaveChannel)){
                                    leaveChannel = {"name":"invalid", "id":"invalid"};
                                }else{leaveChannel = textCommand.ChannelResolveFromMention(client, element.leaveChannel);}
                                
                                if(commands[1]){return msg.channel.send("請使用指定關鍵字：\`set\` 調整狀態，\`channel\` 設定發送頻道")}
                                msg.channel.send(`現在是：\n進入狀態：${element.joinMessage}\n` + 
                                    `離開狀態：${element.leaveMessage}\n ` + 
                                    `進入訊息：${element.joinMessageContent}\n` +
                                    `進入訊息頻道名稱: #${joinChannel.name}\n進入訊息頻道ID: ${joinChannel.id}\n` + 
                                    `離去訊息頻道名稱: #${leaveChannel.name}\n離去訊息頻道ID: ${leaveChannel.id}\n\n` +
                                    `在指令後面輸入 \`set\` 可以調整狀態，輸入 \`channel\` 可以查看發送頻道\n\n` +
                                    `詳細說明請查看 \`${defprea}help joinMessage\``);
                                break;
                        }
                        break;
                        //#endregion
                    
                    case 'ban':
                        //#region 停權
                        if (!msg.member.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS)){
                            return msg.reply("無法執行指令：權限不足：需要具有停權權限");
                        }
                        if (!commands[1]) return msg.reply("未指定成員，請重試");
                        const member = textCommand.MemberResolveFromMention(commands[1]);
                        if (!member) return msg.reply("該用戶不存在，請重試");
                        if (!member.bannable) return msg.reply('我沒辦法停權這位用戶 :(\n');
                        let reasonb = commands.slice(2).join(' ');
                        let banmessage = `您已由 **${msg.author.tag}** 自 **${msg.guild.name}** 停權。`;
                        if(!reasonb){
                            await textCommand.MemberResolveFromMention(client, member.id).send(banmessage);
                            await msg.guild.members.ban(member);
                        }
                        else{
                            banmessage += `\n原因：${reasonb}`;
                            await textCommand.MemberResolveFromMention(client, member.id).send(banmessage);
                            await msg.guild.members.ban(member, {reason:reasonb});
                        }
                        msg.channel.send(`已停權 ${member.user.tag} (ID ${memberk.user.id})`);
                        //#endregion
                        break;
                    
                    case 'kick':
                        //#region 踢出
                        if (!msg.member.permissions.has(Discord.Permissions.FLAGS.KICK_MEMBERS)){ 
                            return msg.reply("無法執行指令：權限不足：需要具有踢出權限");
                        }
                        if (!commands[1]) return msg.reply("未指定成員，請重試");
                        const memberk = textCommand.MemberResolveFromMention(commands[1]);
                        if (!memberk) return msg.reply("該用戶不存在，請重試");
                        if (!memberk.kickable) return msg.reply("我沒辦法踢出這位用戶 :(");
                        let reasonk = commands.slice(2).join(' ');
                        let kickmessage = `您已由 **${msg.author.tag}** 自 **${msg.guild.name}** 踢出。`;
                        if(!reasonk){
                            await textCommand.MemberResolveFromMention(client, memberk.id).send(kickmessage);
                            await memberk.kick();
                        }else{
                            kickmessage += `\n原因：${reasonk}`;
                            await textCommand.MemberResolveFromMention(client, memberk.id).send(kickmessage);
                            await memberk.kick(reasonk);
                        }
                        msg.channel.send(`已踢出 ${memberk.user.tag} (ID ${memberk.user.id})`);
                        //#endregion
                        break;
                    
                    case 'levels':
                    case 'level':
                        msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                            '但請別擔心! 我們已經準備新的斜線指令(/levels)來取代這裡原有的功能!')
                        break;
                        //#endregion

                    case 'reactions': 
                    case 'reaction': 
                    msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                    '但請別擔心! 我們已經準備新的斜線指令(/auto-reply)來取代這裡原有的功能!')
                        break;
                        //#endregion

                    case 'help':
                    case 'h':
                    case '幫助':
                        //#region 幫助清單
                        switch(commands[1]){
                            
                            //#region h/joinMessage
                            case 'joinmessage':
                            case 'joinMessage':
                                const embed4 = new Discord.MessageEmbed()
                                    .setColor(process.env.EMBEDCOLOR)
                                    .setTitle(`管理權限指令清單/joinMessage(進出訊息發送管理)：前輟[${defprea}](需要管理員權限)`)
                                    .setDescription(`關於joinMessage：可以設定歡迎與離去訊息的使用與發送的頻道\n` +
                                                    `以下列出有關指令[\`${defprea}joinMessage\`]可以做的事，本權限全程需要管理員權限\n` + 
                                                    `<此為必填項> [此為選填項]`)
                                    .addField(`${defprea}joinMessage`, `顯示目前的設定檔`)
                                    .addField(`${defprea}joinMessage set`, '調整是否要發送歡迎與離去訊息的設定')
                                    .addField(`${defprea}joinMessage channel`, '設定發送歡迎與離去訊息的頻道')
                                    .addField(`${defprea}joinMessage message`, '設定屬於伺服器的歡迎訊息')
                                    .addField('\n頻道狀態說明', 'undefined:頻道未設定，若此時訊息發送與否為true並存在系統訊息頻道則發送在那裡\n' + 
                                                                'invalid:頻道已消失，若此時訊息發送與否為true時並不會發送訊息，請重新設定頻道')
                                    .addField('系統訊息頻道是什麼?', '會發送 \"有機酸 已加入隊伍。\" 這種訊息的頻道。')
                                    .addField('頻道ID是什麼?', '\"使用者設定->進階->開啟開發者模式\"\n' +
                                                '(行動版： \"使用者設定->行為->開啟開發者模式\" )\n' +
                                                '之後，右鍵/長按頻道時最下方會有個 \"複製ID\" 選項\n可以使用此方法複製頻道ID\n'+
                                                '通常頻道ID會長得像這樣：123456789012345678')
                                    .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請加入此伺服器並聯絡organic_san_2#0500\n` + 
                                                `https://discord.gg/hveXGk5Qmz`)
                                    .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                                msg.channel.send({embeds: [embed4]});
                                break;
                                //#endregion
                            
                            //#region h/ban
                            case 'ban':
                                const embedban = new Discord.MessageEmbed()
                                    .setColor(process.env.EMBEDCOLOR)
                                    .setTitle(`管理權限指令清單/ban(對用戶停權)：前輟[${defprea}](需要停權權限)`)
                                    .setDescription(`以下列出有關機器人的[\`${defprea}ban\`]功能\n` +
                                                    `<此為必填項> [此為選填項]`)
                                    .addField(`${defprea}ban <提及(@)要被停權的用戶> [理由]`,
                                              `停權被提及的用戶(需要賦予機器人停權或管理員權限)，可選擇附上理由\n同時也會向被停權的用戶發送私人通知訊息`)
                                    .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請加入此伺服器並聯絡organic_san_2#0500\n` + 
                                            `https://discord.gg/hveXGk5Qmz`)
                                    .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                                    .setTimestamp()
                                msg.channel.send({embeds: [embedban]});
                                break;
                                //#endregion 

                            //#region h/kick
                            case 'kick':
                                const embedkick = new Discord.MessageEmbed()
                                    .setColor(process.env.EMBEDCOLOR)
                                    .setTitle(`管理權限指令清單/kick(對用戶踢出)：前輟[${defprea}](需要踢出權限)`)
                                    .setDescription(`以下列出有關機器人的[\`${defprea}kick\`]功能\n` +
                                                    `<此為必填項> [此為選填項]`)
                                    .addField(`${defprea}kick <提及(@)要被踢出的用戶> [理由]`,
                                            `踢出被提及的用戶(需要賦予機器人踢出或管理員權限)，可選擇附上理由\n同時也會向被踢出的用戶發送私人通知訊息`)
                                    .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請加入此伺服器並聯絡organic_san_2#0500\n` + 
                                            `https://discord.gg/hveXGk5Qmz`)
                                    .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                                    .setTimestamp()                                
                                msg.channel.send({embeds: [embedkick]});
                                break;
                                //#endregion 

                            //#region h/levels
                            case 'levels':
                                msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                                    '但請別擔心! 我們已經準備新的斜線指令(/levels)來取代這裡原有的功能!')
                                break;
                                //#endregion

                            //#region h/reactions
                            case 'reactions':
                                msg.reply('指令已經開始轉移向斜線指令，或許近日內就會不能再使用不是斜線的指令。\n' +
                                    '但請別擔心! 我們已經準備新的斜線指令(/auto-reply)來取代這裡原有的功能!')
                                break;
                                //#endregion


                            default:
                                //#region h/預設
                                const embed = new Discord.MessageEmbed()
                                    .setColor(process.env.EMBEDCOLOR)
                                    .setTitle(`管理權限指令清單：前輟[${defprea}]`)
                                    .setDescription(`以下列出有關機器人於管理員權限處理的指令(依指令需要指定權限)\n`+ 
                                                    `<此為必填項> [此為選填項]`)
                                    .addField('管理權限指令', 
                                    `\`${defprea}joinMessage\` - 歡迎/道別訊息的設定，請先閱讀\`${defprea}help joinMessage\`\n` + 
                                    `\`${defprea}levels\` - 等級系統設定，請先閱讀\`${defprea}help levels\`\n` + 
                                    `\`${defprea}reactions\` - 反應系統設定，請先閱讀\`${defprea}help reactions\`\n` + 
                                    `\`${defprea}kick <@用戶> [理由]\` - 踢出指定用戶並向該用戶告知\n` +
                                    `\`${defprea}ban <@用戶> [理由]\` - 停權指定用戶並向該用戶告知\n\n` +
                                    `\`${defprea}help <指令>\` - 召喚詳細的幫助清單，例如\`${defprea}help joinMessage\``)
                                    .addField('文字指令', `請使用\`${defpre}help\`查詢`)
                                    .addField('音樂播放指令', `請使用\`${defprem}help\`查詢`)
                                    .addField(`加入有機酸伺服器`,`如果有任何問題或需求，請加入此伺服器並聯絡organic_san_2#0500\n` + 
                                            `https://discord.gg/hveXGk5Qmz`)
                                    .setFooter(`${client.user.tag}`,`${client.user.displayAvatarURL({dynamic: true})}`)
                                    .setTimestamp()
                                msg.channel.send({embeds: [embed]});
                                break;
                                //#endregion
                        }
                        //#endregion
                }
                break;
                //#endregion

            case '6':
            case '7':
                //#region 有機酸專用指令(全)
                if(msg.author.id !== process.env.OWNER1ID && msg.author.id !== process.env.OWNER2ID){return;}
                const text = msg.content.substring(prefix[6].Value.length).split(splitText);
                if(msg.deletable && !msg.deleted){msg.delete().catch(console.error);}
                switch(text[0]){
                    case "CTS": //channel ID to send
                    case "cts":
                    case 't':
                        //#region 指定頻道發言
                        if(!text[1]) return;
                        if(parseInt(text[1]) === parseInt(text[1])){
                            const channelt = textCommand.ChannelResolveFromMention(client, text[1]);
                            channelt.send(msg.content.substring(prefix[6].Value.length + text[0].length + text[1].length + 2))
                        }else{
                            msg.channel.send(msg.content.substring(prefix[6].Value.length + text[0].length + 1));
                        }
                    
                    case "MTD": //Message ID to Delete
                    case "mtd":
                    case 'd':
                        //#region 指定言論刪除
                        if(!text[1]) return;
                        msg.channel.messages.fetch(text[1]).then(async message => 
                            {
                                if(message.deletable && !message.deleted){
                                    message.delete();
                                }
                            }
                        );
                        
                        break;
                        //#endregion
                    
                    case "CMTD": //Channel Message To Delete
                    case "cmtd":
                    case 'c':
                        if(!text[1]) return;
                        if(!text[2]) return;
                        //#region 指定頻道->指定言論刪除
                        const channelc = textCommand.ChannelResolveFromMention(client, text[1])
                        channelc.messages.fetch(text[2]).then(message => {
                                if(message.deletable && !message.deleted){
                                    message.delete();
                                }
                            }
                        )
                        break;
                        //#endregion
                    
                    case 'cl':
                        console.log(msg);
                        break;

                    case 'test':
                        abyss.main(msg);
                        break;

                    case 'u':
                        console.log(msg.author);
                        break;
                    
                    case 'lo':
                        console.log(guildInformation.guilds);
                        break;

                    case 'lou':
                        us = guildInformation.getGuild(msg.guild.id);
                        console.log(us.users);
                        break;

                    case 'louj':
                        us = guildInformation.getGuild(msg.guild.id);
                        console.log(JSON.stringify(us, null, '\t'));
                        break;

                    case 'lu':
                        const us2 = guildInformation.getGuild(msg.guild.id);
                        console.log(us2.getUser(msg.author.id));
                        break;

                    case 'gl':
                        console.log(guildInformation.guildList);
                        break;

                    case 'addexp':
                        if(!text[1]) return;
                        if(Number.isNaN(parseInt(text[1]))) return;
                        const lvup = element.getUser(msg.author.id).addexp(parseInt(text[1]), true, true);
                        if(lvup) element.sendLevelsUpMessage(msg.author, msg.channel, msg.guild, defpre);
                        break;

                    case "save":
                    case "s":
                        //#region 更新伺服器資料
                        fs.writeFile("./data/guildInfo/guildlist.json", JSON.stringify(guildInformation.guildList, null, '\t'), (err) => {
                            if (err)
                                console.log(err);
                        });
                        guildInformation.guilds.forEach(async (element) => {
                            const filename = `./data/guildInfo/${element.id}.json`;
                            fs.writeFile(filename, JSON.stringify(element, null, '\t'), (err) => {
                                if (err)
                                    return console.log(err);
                            });
                        });
                        time = new Date(Date.now());
                        console.log(`Saved in ${time} (手動)`);
                        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`手動存檔: ${time}`));
                        break;
                        //#endregion
                    
                    case "SendInformationToEveryOwner": //Send Information To Every Owner
                        //#region 向伺服器擁有者發言
                        const chance = "NO";
                        if(chance === "YES"){
                            guildInformation.guilds.forEach(async (element) => {
                                const ownerId = client.guilds.cache.get(element.id).ownerId;
                                const guildName = client.guilds.cache.get(element.id).name;
                                const owner = await client.users.fetch(ownerId);
                                owner.send(`您好，我是acid bot的開發者 有機酸。\n` + 
                                `目前打算逐步將機器人的指令替換成斜線指令(slash command)，因此需要將新的權限賦予機器人才能使用。\n` + 
                                `請輕點此連結以賦予 **${client.user.tag}** 在您的伺服器中使用斜線指令(不需將機器人踢出):\n` + 
                                `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=536270990591&scope=bot%20applications.commands\n` + 
                                `感謝您持續使用本機器人，今後將持續添加新功能，歡迎加入此伺服器並聯絡organic_san_2#0500\nhttps://discord.gg/hveXGk5Qmz`);
                            });
                        }
                        break;
                        //#endregion 

                    default:
                        const remindmessaged = await msg.channel.send(
                            "\`cts\`, \`mts\`, \`cmtd\`, \`save\`, \`lo\`, \`lou\`, \`louj\`, \`cl\`"
                        );
                        setTimeout(() => remindmessaged.delete(), 5 * 1000);
                        break;
                }
                break;
                //#endregion
        }
    }catch(err){
        console.log('OnMessageError', err); 
    }
});
//#endregion

//#region 進入、離去觸發事件guildMemberAdd、guildMemberRemove
client.on('guildMemberAdd', member => {
    console.log(`${member.user.tag} (${member.user.id}) 加入了 ${member.guild.name} (${member.guild.id})。`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
        channel.send(`${member.user.tag} (${member.user.id}) 加入了 ${member.guild.name} (${member.guild.id})。`)
    );
    const element = guildInformation.getGuild(member.guild.id);
    if(!element.joinMessage) return;
    if(!element.joinChannel){
        if(!member.guild.systemChannel) return;
        if(!element.joinMessageContent)
            member.guild.systemChannel.send(`${member} ，**歡迎來到 ${member.guild.name}** !`);
        else
            member.guild.systemChannel.send(`${member} ，**歡迎來到 ${member.guild.name}** !\n${element.joinMessageContent}`);
    }else{
        if(!textCommand.ChannelResolveFromMention(client, element.joinChannel)){return;}
        if(!element.joinMessageContent)
            client.channels.fetch(element.joinChannel).then(channel => channel.send(`${member} ，歡迎來到 **${member.guild.name}** !`));
        else
            client.channels.fetch(element.joinChannel).then(channel => channel.send(`${member} ，歡迎來到 **${member.guild.name}** !\n` + 
            `${element.joinMessageContent}`));
    }  
});

client.on('guildMemberRemove', member => {
    console.log(`${member.user.tag} 已自 **${member.guild.name}** 離開。`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`${member.user.tag} 已自 ${member.guild.name} 離開。`));
    const element = guildInformation.getGuild(member.guild.id);
    if(!element.leaveMessage) return;
    if(!element.leaveChannel){
        if(!member.guild.systemChannel){return;}
        member.guild.systemChannel.send(`**${member.user.tag}** 已遠離我們而去。`);
    }else{
        if(!textCommand.ChannelResolveFromMention(client, element.leaveChannel)){return;}
        client.channels.fetch(element.leaveChannel).then(channel => channel.send(`**${member.user.tag}** 已遠離我們而去。`));
    }  
});
//#endregion

//#region 機器人被加入、踢出觸發事件guildCreate、guildDelete
client.on("guildCreate", guild2 => {

    if(!guildInformation.has(guild2.id)){
        const thisGI = new guild.GuildInformation(guild2, []);
        guildInformation.addGuild(thisGI);
    }
    var a = 0;
    console.log(`${client.user.tag} 加入了 ${guild2.name} (${guild2.id}) (新增事件觸發)`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
        channel.send(`${client.user.tag} 加入了 **${guild2.name}** (${guild2.id}) (新增事件觸發)`)
    );
    if(guild2.systemChannel){
        guild2.systemChannel.send(`歡迎使用acid bot！使用斜線指令來操作我的力量！`).catch(err => console.log(err))
    }
    guild2.fetchOwner().then(owner => { 
    owner.send(
        `您或您伺服器的管理員剛剛讓 **${client.user.tag}** 加入了 **${guild2.name}**！\n\n` + 
        `使用指令 \`%help\` 查詢 ${client.user.tag} 的基本指令！\n` + 
        `也可以使用 \`a^help\` 來查看專屬於管理系統的酷酷指令！\n` +
        `例如可以使用 \`a^help levels\` 查看調整等級系統的方法，\n` +
        `而 \`a^help joinMessage\` 則可以查看如何在有人進入時發送歡迎訊息！`); 
    }).catch(err => console.log(err));
    
 });

client.on("guildDelete", guild => {
    console.log(`${client.user.tag} 從 ${guild.name} 中被踢出了`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`${client.user.tag} 從 **${guild.name}** 中被踢出了`));
    fs.unlink(`./data/guildInfo/${guild.id}.json`, function () {
        console.log(`刪除: ${guild.name} 的存檔`);
    });
    guildInformation.removeGuild(guild.id);
});
//#endregion

/*
//#region 機器人編輯、刪除訊息觸發事件guildCreate、messageDelete
client.on('messageDelete', async message => {
    if (!message.guild) return;
    if (!message.author) return;

    const fileimage = message.attachments.first();
    if(!fileimage && message.content.length < 3) return

    const embed = new Discord.MessageEmbed()
        .setAuthor(message.author.tag, message.author.displayAvatarURL({dynamic: true}))
        .setColor(process.env.EMBEDCOLOR)
        .setDescription(message.content)
        .setFooter(`#${message.channel.name}`,
            `https://cdn.discordapp.com/icons/${message.guild.id}/${message.guild.icon}.jpg`)
        .setTimestamp(message.createdAt);


    if (fileimage){
        if (fileimage.height || fileimage.width)
        { embed.setImage(fileimage.url); }
    }
    //TODO: 刪除訊息管理
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild) return;
    if (!oldMessage.author) return;

    const oldfileimage = oldMessage.attachments.first();
    if( ( !oldfileimage) && (oldMessage.content.length < 3 || newMessage.content.length < 3)) return

    const embed = new Discord.MessageEmbed()
        .setAuthor(oldMessage.author.tag, oldMessage.author.displayAvatarURL({dynamic: true}))
        .setColor(process.env.EMBEDCOLOR)
        .addField("Old Message:", oldMessage.content ?? "(empty)") //TODO: 編輯訊息：這裡似乎有些問題，再看一下
        .addField("New Message:", newMessage.content ?? "(empty)")
        .setFooter(`#${oldMessage.channel.name}`,
            `https://cdn.discordapp.com/icons/${oldMessage.guild.id}/${oldMessage.guild.icon}.jpg`)
        .setTimestamp(oldMessage.createdAt);


    if (oldfileimage){
        if (oldfileimage.height || oldfileimage.width)
        { embed.setImage(oldfileimage.url); }
    }
    //TODO: 編輯訊息管理
})
//#endregion
*/