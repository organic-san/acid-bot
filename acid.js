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
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

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
                console.log(element);
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
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        isReady = true;
    }, 4000);
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
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`自動存檔: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err));
    },10 * 60 * 1000)
});
//#endregion

client.on('interactionCreate', async interaction => {

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");

    //伺服器資料建立&更新
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
    if(!interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.SEND_MESSAGES) || 
        !interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.ADD_REACTIONS))
        return interaction.reply({content: "我不能在這裡說話!", ephemeral: true});

    //讀取指令ID，過濾無法執行(沒有檔案)的指令
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

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
        if (msg.content === '龜雞奶'){
            msg.react('🐢').catch(err => console.log(err));
            msg.react('🐔').catch(err => console.log(err));
            msg.react('🥛').catch(err => console.log(err));
        }

        if (msg.content.includes('上龜雞奶') && msg.content.includes('樓')){
            const regex = /上/g;

            if(msg.content.match(regex).length <= 100){
                const beforeMessage = await msg.channel.messages.fetch({ before: msg.id, limit: msg.content.match(regex).length })
                .then(messages => messages.last())
                .catch(console.error)

                if(beforeMessage){
                    if(!beforeMessage.deleted){beforeMessage.react('🐢').catch(err => console.log(err));
                        if(!beforeMessage.deleted){beforeMessage.react('🐔').catch(err => console.log(err));}
                        if(!beforeMessage.deleted){beforeMessage.react('🥛').catch(err => console.log(err));}
                    }else{
                        if(!msg.deleted){
                                msg.react('😢').catch(err => console.log(err));
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
                    responser.react('🐢').catch(err => console.log(err));
                    if(!responser.deleted){ responser.react('🐔').catch(err => console.log(err));}
                    if(!responser.deleted){ responser.react('🥛').catch(err => console.log(err));}
                }else{
                    if(!msg.deleted){
                        msg.react('😢').catch(err => console.log(err));
                    }
                }
            }else{
                if(!msg.deleted){
                    msg.react('😢').catch(err => console.log(err));
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
                if(msg.guild.id === '881520130926981172') return;
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
        if(member.permissions.has(Discord.Permissions.FLAGS.MANAGE_WEBHOOKS) && !isCommand){
            if(!msg.channel.isThread()){
                const notEmoji = msg.content.split(/:\w+:/g);
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
                            msg.channel.createWebhook(msg.member.displayName, {
                                avatar: msg.author.displayAvatarURL({dynamic: true})
                            })
                                .then(webhook => webhook.send({content: words, allowedMentions: {repliedUser: false}}))
                                .catch(console.error);
                        } else {
                            webhook.edit({
                                name: msg.member.displayName,
                                avatar: msg.author.displayAvatarURL({dynamic: true})
                            })
                                .then(webhook => webhook.send({content: words, allowedMentions: {repliedUser: false}}))
                                .catch(console.error);
                        }
                        if(!msg.deleted && msg.deletable) msg.delete().catch((err) => console.log(err));
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
                const cmd = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText); //以空白分割前綴以後的字串

                switch (cmd[0]) {
                    
                    case 'numbercount':
                    case '數數字':
                    case 'countnumber':
                    case 'numbering':
                    case 'cn':
                    case 'nc':
                        //#region 數數字part2
                        await msg.channel.sendTyping();
                        if(numberingList.get(msg.channel.id) === undefined){
                            msg.channel.send('開始數數字！下一個數字：1');
                            numberingList.set(msg.channel.id, 0);
                        }else{
                            msg.channel.send(`下一個數字：${numberingList.get(msg.channel.id) + 1}`);
                        }
                        break;
                        //#endregion

                    case 'invite':
                    case '邀請':
                        await msg.channel.sendTyping();
                        msg.channel.send({embeds: [textCommand.invite(client.user, msg.channel)]});
                        break;
                    
                    default:
                        await msg.channel.sendTyping();
                        if(cmd[0].match(/[a-z]/)) msg.reply('原有的指令不再提供支援，取而代之的是，您可以使用斜線指令(/slash command)!');
                        break;
                }
                break;
                //#endregion
            
            case '3': //舊音樂
            case '4':
                const cmd = msg.content.substring(prefix[tempPrefix].Value.length).split(splitText); //以空白分割前綴以後的字串
                if(cmd[0].match(/[a-z]/)){
                await msg.channel.sendTyping();
                msg.reply('原有的指令不再提供支援，取而代之的是，您可以使用斜線指令(/slash command)!');
                }
                break;

            case '4': //管理指令
            case '5':
                //#region 管理指令(全)
                await msg.channel.sendTyping();

                const commands = msg.content.substring(prefix[4].Value.length).split(splitText); //以空白分割前綴以後的字串
                const filter = message => message.author.id === msg.author.id;
                switch(commands[0]){
                    
                    case 'ban':
                        //#region 停權
                        if (!msg.member.permissions.has(Discord.Permissions.FLAGS.BAN_MEMBERS)){
                            return msg.reply("無法執行指令：權限不足：需要具有停權權限");
                        }
                        if (!commands[1]) return msg.reply("未指定成員，請重試");
                        const member = textCommand.MemberResolveFromMention(msg.guild, commands[1]);
                        if (!member) return msg.reply("該用戶不存在，請重試");
                        if (!member.bannable) return msg.reply('我沒辦法停權這位用戶 :(\n');
                        let reasonb = commands.slice(2).join(' ');
                        let banmessage = `您已由 **${msg.author.tag}** 自 **${msg.guild.name}** 停權。`;
                        if(!reasonb){
                            await textCommand.MemberResolveFromMention(msg.guild, member.id).send(banmessage);
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
                        const memberk = textCommand.MemberResolveFromMention(msg.guild, commands[1]);
                        if (!memberk) return msg.reply("該用戶不存在，請重試");
                        if (!memberk.kickable) return msg.reply("我沒辦法踢出這位用戶 :(");
                        let reasonk = commands.slice(2).join(' ');
                        let kickmessage = `您已由 **${msg.author.tag}** 自 **${msg.guild.name}** 踢出。`;
                        if(!reasonk){
                            await textCommand.MemberResolveFromMention(msg.guild, memberk.id).send(kickmessage);
                            await memberk.kick();
                        }else{
                            kickmessage += `\n原因：${reasonk}`;
                            await textCommand.MemberResolveFromMention(msg.guild, memberk.id).send(kickmessage);
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
                                    .setDescription(`關於joinMessage：可以設定歡迎與送別訊息的使用與發送的頻道\n` +
                                                    `以下列出有關指令[\`${defprea}joinMessage\`]可以做的事，本權限全程需要管理員權限\n` + 
                                                    `<此為必填項> [此為選填項]`)
                                    .addField(`${defprea}joinMessage`, `顯示目前的設定檔`)
                                    .addField(`${defprea}joinMessage set`, '調整是否要發送歡迎與送別訊息的設定')
                                    .addField(`${defprea}joinMessage channel`, '設定發送歡迎與送別訊息的頻道')
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
                        break;
                        
                    default:
                        await msg.channel.sendTyping();
                        if(cmd[0].match(/[a-z]/)) msg.reply('原有的指令不再提供支援，取而代之的是，您可以使用斜線指令(/slash command)!');
                        break;
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
                        if(!Number.isNaN(parseInt(text[1]))){
                            const channelt = textCommand.ChannelResolveFromMention(client, text[1]);
                            channelt.send(msg.content.substring(prefix[6].Value.length + text[0].length + text[1].length + 2))
                        }else{
                            msg.channel.send(msg.content.substring(prefix[6].Value.length + text[0].length + 1));
                        }
                        break;
                    
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

                    case 't2':
                        client.user.setAFK();
                        break;
                    
                    case 'lo':
                        console.log(guildInformation.guilds);
                        break;

                    case 'lou':
                        us = guildInformation.getGuild(msg.guild.id);
                        console.log(us.users);
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
                        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`手動存檔: <t:${Math.floor(Date.now() / 1000)}:F>`));
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

//#region 進入、送別觸發事件guildMemberAdd、guildMemberRemove
client.on('guildMemberAdd', member => {
    console.log(`${member.user.tag} (${member.user.id}) 加入了 ${member.guild.name} (${member.guild.id})。`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
        channel.send(`${member.user.tag} (${member.user.id}) 加入了 **${member.guild.name}** (${member.guild.id})。`)
    );
    const element = guildInformation.getGuild(member.guild.id);
    if(!element.joinMessage) return;
    if(!element.joinChannel){
        if(!member.guild.systemChannel) return;
        if(!element.joinMessageContent)
            member.guild.systemChannel.send(`${member} ，歡迎來到 **${member.guild.name}** !`);
        else{
            if(element.joinMessageContent.includes("<user>") && element.joinMessageContent.includes("<server>")){
                const msg = element.joinMessageContent.split("<user>").join(` ${member} `).split("<server>").join(` **${member.guild.name}** `)
                member.guild.systemChannel.send(msg);
            }else
                member.guild.systemChannel.send(`${member} ，歡迎來到 **${member.guild.name}** !\n${element.joinMessageContent}`);
        }
            
    }else{
        if(!textCommand.ChannelResolveFromMention(client, element.joinChannel)) return;
        if(!element.joinMessageContent)
            client.channels.fetch(element.joinChannel).then(channel => channel.send(`${member} ，歡迎來到 **${member.guild.name}** !`));
        else{
            if(element.joinMessageContent.includes("<user>") && element.joinMessageContent.includes("<server>")){
                const msg = element.joinMessageContent.split("<user>").join(` ${member} `).split("<server>").join(` **${member.guild.name}** `)
                client.channels.fetch(element.joinChannel).then(channel => channel.send(msg));
            }else
                client.channels.fetch(element.joinChannel).then(channel => channel.send(`${member} ，歡迎來到 **${member.guild.name}** !\n` + 
                `${element.joinMessageContent}`));
        }
    }  
});

client.on('guildMemberRemove', member => {
    console.log(`${member.user.tag} 已自 ${member.guild.name} 離開。`);
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`${member.user.tag} 已自 **${member.guild.name}** 離開。`));
    const element = guildInformation.getGuild(member.guild.id);
    if(!element.leaveMessage) return;
    if(!element.leaveChannel){
        if(!member.guild.systemChannel){return;}
        if(!element.leaveMessageContent)
            member.guild.systemChannel.send(`**${member.user.tag}** 已遠離我們而去。`);
        else{
            const msg = element.leaveMessageContent.split("<user>").join(` **${member.user.tag}** `).split("<server>").join(` **${member.guild.name}** `)
            member.guild.systemChannel.send(msg);
        }
    }else{
        if(!textCommand.ChannelResolveFromMention(client, element.leaveChannel)) return;
        if(!element.leaveMessageContent)
            client.channels.fetch(element.leaveChannel).then(channel => channel.send(`**${member.user.tag}** 已遠離我們而去。`));
        else{
            const msg = element.leaveMessageContent.split("<user>").join(` **${member.user.tag}** `).split("<server>").join(` **${member.guild.name}** `)
            client.channels.fetch(element.leaveChannel).then(channel => channel.send(msg));
        }
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
        const l = client.user.tag;
        guild2.systemChannel.send(`歡迎使用${l.slice(1, l.length)}！使用斜線指令(/help)來查詢我的功能！`).catch(err => console.log(err))
    }
    guild2.fetchOwner().then(owner => { 
        owner.send(
            `您或您伺服器的管理員剛剛讓 **${client.user.tag}** 加入了 **${guild2.name}**！\n\n` + 
            `我的功能可以使用/help來查詢！`).catch(err => console.log(err)); 
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