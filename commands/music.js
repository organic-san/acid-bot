const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const music = require('../JSmodule/musicListClass');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const search = require('youtube-search');
const Voice = require("@discordjs/voice");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('music')
        .setDescription('音樂系統')
        .addSubcommand(opt =>
            opt.setName('play')
            .setDescription('播放音樂，並讓機器人加入語音通話')
            .addStringOption(opt => 
                opt.setName('music-url-or-title')
                .setDescription('音樂、播放清單網址或音樂名稱')
                .setRequired(true)
            )
        ).addSubcommand(opt =>
            opt.setName('nowplaying')
            .setDescription('顯示現在播放的音樂資訊')
        ).addSubcommand(opt =>
            opt.setName('queue')
            .setDescription('顯示目前的音樂清單')
        ).addSubcommand(opt =>
            opt.setName('pause')
            .setDescription('暫停/取消暫停音樂')
        ).addSubcommand(opt =>
            opt.setName('replay')
            .setDescription('重新播放目前的音樂')
        ).addSubcommand(opt =>
            opt.setName('random')
            .setDescription('隨機洗牌目前的播放清單')
        ).addSubcommand(opt =>
            opt.setName('loop')
            .setDescription('循環播放目前的音樂')
        ).addSubcommand(opt =>
            opt.setName('loopqueue')
            .setDescription('循環播放整個播放清單')
        ).addSubcommand(opt =>
            opt.setName('skip')
            .setDescription('跳過目前播放的音樂')
        ).addSubcommand(opt =>
            opt.setName('remove')
            .setDescription('移除指定排序的音樂')
            .addIntegerOption(opt => 
                opt.setName('from')
                .setDescription('要開始移除的音樂編號')
                .setRequired(true)
            ).addIntegerOption(opt => 
                opt.setName('amount')
                .setDescription('從那首音樂開始要移除的音樂數量，預設為1')
            )
        ).addSubcommand(opt =>
            opt.setName('clearqueue')
            .setDescription('清空整個播放清單')
        ).addSubcommand(opt =>
            opt.setName('disconnect')
            .setDescription('讓機器人退出語音')
        ),
    tag: "musicList",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {music.MusicList} musicList
     */
	async execute(interaction, musicList) {

        if(interaction.channel.isThread()) return interaction.reply("無法在討論串使用音樂功能喔!");
        
        switch(interaction.options.getSubcommand()) {
            case 'play':
                //點歌&播放
                const songUrl = interaction.options.getString('music-url-or-title');
                playmusic(musicList, interaction, songUrl);
                break;

            case 'replay':
                //重播
                replaymusic(musicList, interaction);
                break;

            case 'nowplaying':
                //歌曲資訊
                nowplaying(musicList, interaction);
                break;

            case 'queue':
                //#region 清單
                if(!musicList) return interactionReply(interaction, `這份清單似乎是空的。我無法讀取其中的資料。`, true); 
                if(musicList.song.length <= 0) return interactionReply(interaction, `這份清單似乎是空的。我無法讀取其中的資料。`, true);

                const pageShowHax = 6;
                let page = 0;
                const musicQueue = queueplay(musicList, page, pageShowHax);
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
                const msg = await interaction.reply({embeds: [musicQueue], components: [row], fetchReply: true});

                const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot && i.message.id === msg.id;
                const collector = interaction.channel.createMessageComponentCollector({filter, time: 60 * 1000 });
                
                collector.on('collect', async i => {
                    if (i.customId === '下一頁') 
                        if(page * pageShowHax + pageShowHax < musicList.songlength) page++;
                    if(i.customId === '上一頁')
                        if(page > 0) page--;
                    const musicQueue = queueplay(musicList, page, pageShowHax);
                    i.update({embeds: [musicQueue], components: [row]});
                    collector.resetTimer({ time: 60 * 1000 });
                });
                
                collector.on('end', (c, r) => {
                    if(r !== "messageDelete"){
                        const musicQueue = queueplay(musicList, page, pageShowHax);
                        interaction.editReply({embeds: [musicQueue], components: []})
                    }
                });
                break;
                //#endregion
            
            case 'pause':
                //暫停
                pause(musicList, interaction);
                break;
            
            case 'loop':
                //循環
                loop(musicList, interaction);
                break;

            case 'loopqueue':
                //清單循環
                loopqueue(musicList, interaction);
                break;

            case 'random':
                random(musicList, interaction);
                break;

            case 'skip':
                //中斷
                skip(musicList, interaction);
                break;

            case 'clearqueue':
                //跳過整個清單
                clearqueue(musicList, interaction);
                break;

            case 'remove':
                //移除
                const from = interaction.options.getInteger('from');
                const amount = interaction.options.getInteger('amount');
                removemusic(from, amount, musicList, interaction);
                break;

            case 'disconnect':
                //退出並清空
                disconnect(interaction);
                break;
        }
	},
};

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @param {string} songUrl
 * @returns 
 */
async function playmusic(musicList, interaction, songUrl){
    try {

        var a = 0;
        if(!interaction.member.voice.channel){
            return interactionReply(interaction, `找不到可以一同享受音樂的與音頻道，你要不要先找一個進去?`, true);
        }
        if(!interaction.member.voice.channel.joinable){
            return interactionReply(interaction, `咦? 你在哪個語音頻道? 我似乎進不去QQ`, true)
        }
        //if(!interaction.member.voice.channel.speakable){
        //    return interactionReply(interaction, `咳咳，我似乎不能在那裏講話。`, true);
        //}
        //第一個參數不是連結就搜尋
        if(!songUrl.startsWith("http")){
            interaction.reply(`正在搜尋：\`${songUrl}\``);
            a++;
            var opts = {
                maxResults: 1,
                key: process.env.YTKEY,
                type: 'video'
            };
            search(songUrl, opts, (err, results) => {
                if(err || !results){
                    interactionReply(interaction, `看來Youtube並沒有給我搜尋 \`${songUrl}\` 的結果。要不要再試一次?`, true);
                    console.log(err); 
                    return;
                }
                if(results) playmusic(musicList, interaction, results[0].link);
            });
            
        }
        if(a > 0) return;
        //透過library判斷連結是否可運行
        const validate = ytdl.validateURL(songUrl);
        if (!validate){
            const listPlayable = ytpl.validateID(songUrl);
            if (listPlayable) {
                const playlist = await ytpl(songUrl);
                playlist.items.forEach(async (element) => {
                    if (element.title !== '[Deleted video]') {
                        await playmusic(musicList, interaction, element.shortUrl);
                    }
                });
                return interactionReply(interaction, "已載入播放清單。部分音樂可能因為讀取失敗而未載入，請見諒。待音樂讀取完後會開始播放。");
            } else {
                return interactionReply(interaction, `你確定你的連結是音樂或播放清單嗎?要不要再確認一次?`, true);
            }
        }
        //獲取歌曲資訊
        const info = await ytdl.getInfo(songUrl);
        if(!info.videoDetails){
            return interactionReply(interaction, `不知道為什麼，找不到網址裡頭的音樂?可以再試一次嗎?`, true)
        }
        if(info.videoDetails.age_restricted){
            return interactionReply(interaction, '這支影片是不是有年齡限制?我還太幼了不能看QQ', true);
        }
        const songLength = info.videoDetails.lengthSeconds;
        if(parseInt(songLength) < 2){
            return interactionReply(interaction, '影片太短了! 請至少大於2秒!', true);
        }
        //判斷bot是否已經連到語音頻道 是:將歌曲加入歌單 不是:進入語音頻道並且播放歌曲
        musicList.channel = interaction.channel;
        if(!Voice.getVoiceConnection(interaction.guild.id)){
            await interactionReply(interaction, `請稍等，即將進入語音頻道...`);

            //進入語音頻道
            Voice.joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: musicList.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfMute: false
            })

            //將歌曲加入歌單
            musicList.songPush(new music.SongUnit(
                info.videoDetails.title, 
                songUrl, 
                info.videoDetails.videoId,
                songLength, 
                interaction.user
            ))

            setTimeout(() => {
                //創建播放器
                musicList.createPlayer();
                Voice.getVoiceConnection(interaction.guild.id).subscribe(musicList.player);

                //讀取資源
                resourcePlay(musicList);

                //啟動被踢出偵測器與音樂播放偵測器
                connectionCheck(musicList);
                playerCheck(musicList);
            }, 1500);
            
        }else{

            //將歌曲加入歌單
            musicList.songPush(new music.SongUnit(
                info.videoDetails.title, 
                songUrl, 
                info.videoDetails.videoId,
                songLength, 
                interaction.user
            ))
            
            //清單為零時再次開始讀取資源
            if(musicList.songlength === 1){
                resourcePlay(musicList);
            }
        }
        //發送已加入歌單
        const longsec = musicList.lastSong.longsec;
        const longmin = musicList.lastSong.longmin;
        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setAuthor(`音樂已加入歌單`, `${interaction.user.displayAvatarURL({dynamic: true})}`)
            .setTitle(`${musicList.lastSong.title}`)
            .setURL(`${songUrl}`)
            .addField('頻道名稱', `${info.videoDetails.author.name}`, true)
            .addField('音樂長度', `${longmin}:${longsec}`, true)
            .addField('歌曲位置', `${musicList.songlength - 1}`, true)
            .setThumbnail(musicList.lastSong.getThumbnail())
        interactionReply(interaction, undefined, false,  [embed]);
    }catch(err){
        console.log(err, 'playMusicError');
    }
}

/**
 * 讀取音樂資源
 * @param {music.MusicList} musicList 
 */
async function resourcePlay(musicList){
    //#region resourcePlay 音樂資源讀取函數
    try{
        if(musicList.songlength > 0){
            if(!Voice.getVoiceConnection(musicList.guildId)) return;
            //設定音樂相關參數
            const streamOptions = {
                inlineVolume: true
            };
            //讀取清單第一位網址
            const stream = ytdl(musicList.firstSong.url, {
                filter: 'audioonly',
                quality: 'lowestaudio',
                highWaterMark: 52428800 //50ms
            });

            const resource = Voice.createAudioResource(stream, streamOptions);
            resource.volume.volume = 0.8;
            musicList.player.play(resource);

            musicList.playerPause();
            await musicList.channel.sendTyping();
            const title = musicList.firstSong.title;
            const longsec = musicList.firstSong.longsec;
            const longmin = musicList.firstSong.longmin;
            const embed = new Discord.MessageEmbed()
                    .setColor(process.env.EMBEDCOLOR)
                    .setAuthor('現正播放', `${musicList.getClientUserAvatar()}`)
                    .setTitle(`${title} [${longmin}分 ${longsec}秒]`)
                    .setURL(`${musicList.firstSong.url}`)
                    .setThumbnail(musicList.firstSong.getThumbnail())
                    .setFooter(`由 ${musicList.firstSong.getPlayerTag()} 點播這首音樂`,
                            `${musicList.firstSong.getPlayerAvatar()}`);
            await musicList.channel.send({embeds: [embed]}).then(message => {
                if(musicList.songlength > 0){
                    musicList.setPlayingMessage(message);
                    musicList.playerUnpause();
                }
            });
        }
    }catch(err){
        console.log(err, 'playingMusicError');
    }
}

/**
 * 啟動撥放器檢測器
 * @param {music.MusicList} musicList 
 */
function playerCheck(musicList){

    //檢測音樂播放結束
    musicList.player.on(Voice.AudioPlayerStatus.Idle, (oldState) =>{
        if(oldState !== Voice.AudioPlayerStatus.Idle){
            //刪「正在播放」訊息
            musicList.deletePlayingMessage();
            if(musicList.isLoopList && !musicList.isReplay && !musicList.isLoop){
                musicList.songPush(musicList.firstSong);
            }
            if(musicList.isReplay){musicList.isReplay = false}
            if(musicList.songlength > 0 && !musicList.isLoop){
                //自播放清單移除音樂
                musicList.songShift();
            }
            //載入下一首音樂
            resourcePlay(musicList);
        }
    });

    musicList.player.on('error', error => {
        console.error(error, "PlayingMusicError/PlayerError");
    });
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {number} page 所需求的頁數
 * @param {number} pageShowHax 單頁頁數
 * @returns 
 */
function queueplay(musicList, page, pageShowHax){
    //#region queuePlay 播放清單列舉函數(字數限制尚未處理)
    try{
        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`**播放清單**`);
        
        let songqueue = '';
        let footer = '';
        let title = musicList.firstSong.title;
        let url = musicList.firstSong.url;
        let longsec = musicList.firstSong.longsec;
        let longmin = musicList.firstSong.longmin;
        if(title.length > 40){title = title.substring(0,40) + `...`;}
        embed.addField("現正播放：", `[${title}](${url}) | [${longmin}:${longsec}] [播放者：${musicList.firstSong.userPlayer}]`);
        
        for(let i = page * pageShowHax + 1; i < Math.min(page * pageShowHax + pageShowHax + 1, musicList.songlength); i++){
            let message = '';
            //歌曲標題
            let title = musicList.song[i].title;
            let url = musicList.song[i].url;
            let longsec = musicList.song[i].longsec;
            let longmin = musicList.song[i].longmin;
            if(title.length > 40){title = title.substring(0,40) + `...`;}
            message = message + `\n\n${i}. [${title}](${url}) | [${longmin}:${longsec}] [播放者：${musicList.song[i].userPlayer}]`;
            songqueue = songqueue + message;
        }
        if(musicList.songlength > 1){
            embed.addField(`即將播放(#${page * pageShowHax + 1} ~ ` + 
                `#${Math.min(page * pageShowHax + pageShowHax, musicList.songlength - 1)} / ` +
                `#${musicList.songlength - 1})：`, songqueue);
        }
        if(musicList.isLoop){footer += '[looping: ⭕]';}else{footer += '[looping: ❌]';}
        if(musicList.isLoopList){footer += ' [loopList: ⭕]';}else{footer += ' [loopList: ❌]';}
        embed.setFooter(footer);
        return embed;

    }catch(err){
        console.log(err, 'queueShowError');
    }
}

/**
 * 啟動中斷連接(被踢出)檢測器
 * @param {music.MusicList} musicList 
 */
function connectionCheck(musicList){
    Voice.getVoiceConnection(musicList.guildId).on(Voice.VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                Voice.entersState(Voice.getVoiceConnection(musicList.guildId), Voice.VoiceConnectionStatus.Signalling, 5_000),
                Voice.entersState(Voice.getVoiceConnection(musicList.guildId), Voice.VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (error) {
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            Voice.getVoiceConnection(musicList.guildId).destroy();
        }
    });

    Voice.getVoiceConnection(musicList.guildId).on(Voice.VoiceConnectionStatus.Destroyed, () => {
        //清空資料
        musicList.reset();
    })
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function replaymusic(musicList, interaction){
    //#region replayMusic 重新播放函數
    if(!musicList) return interactionReply(interaction, `現在是不是沒有在播音樂?我沒辦法讓它重頭播放。`, true);
    if(musicList.songlength <= 0) return interactionReply(interaction, `現在是不是沒有在播音樂?我沒辦法讓它重頭播放。`, true);
    if(!musicList.isLoop) musicList.songUnshift(musicList.firstSong);
    musicList.isReplay = true;
    musicList.player.stop();
    interactionReply(interaction, "重新開始播放音樂");
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function nowplaying(musicList, interaction){
    //#region nowPlaying 音樂資訊顯示函數
    try{
        if(!musicList) 
            return interactionReply(interaction, `我的心靈(跟清單)現在感覺非常空虛。可以放一首音樂填補我心中的洞嗎?`, true);
        if(musicList.songlength <= 0) 
            return interactionReply(interaction, `我的心靈(跟清單)現在感覺非常空虛。可以放一首音樂填補我心中的洞嗎?`, true);
        let footer = '';
        const title = musicList.firstSong.title;
        const nowSongLength = Math.floor(musicList.playingTime / 1000);
        const longsec = musicList.firstSong.longsec;
        const longmin = musicList.firstSong.longmin;
        let nowLongsec = nowSongLength;
        const nowLongmin = Math.floor(nowLongsec/60);
        nowLongsec = nowLongsec - (nowLongmin*60);
        if(nowLongsec < 10){nowLongsec = `0` + nowLongsec;}

        let mainText = '🟡';
        const secondText = '▬';
        const thirdText = '▬';
        const whereMain = Math.floor((nowSongLength / musicList.firstSong.long) * 100);
        let timebar = '';
        for (let i = 1; i <= 20; i++) {
            if (i * 5 + 1 >= whereMain) {
                timebar = timebar + mainText;
                mainText = thirdText;
            } else {
                timebar = timebar + secondText;
            }
        }
        if(musicList.isLoop){footer += '[looping: ⭕]';}else{footer += '[looping: ❌]';}
        if(musicList.isLoopList){footer += ' [loopList: ⭕]';}else{footer += ' [loopList: ❌]';}

        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`${title}`)
            .setURL(`${musicList.firstSong.url}`)
            .setThumbnail(musicList.firstSong.getThumbnail())
            .setDescription(`[播放者：${musicList.firstSong.userPlayer}]`) 
            .addField(`[ ${nowLongmin}:${nowLongsec} / ${longmin}:${longsec} ]`,`${timebar}`,false)
            .setFooter(footer);
            interactionReply(interaction, undefined, false, [embed]);
    }catch (err){
        console.log(err, 'nowPlayMusicError');
    }
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function pause(musicList, interaction){
    //#region pause 暫停播放函數
    try{
        if(!musicList) return interactionReply(interaction, `咦?音樂呢?暫停按鈕去哪了?`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `咦?音樂呢?暫停按鈕去哪了?`, true);
        if(musicList.player.state.status === Voice.AudioPlayerStatus.Paused){
            musicList.playerUnpause();
            interaction.reply(`取消暫停音樂!`);
        }else{
            musicList.playerPause();
            interaction.reply(`暫停播放音樂!`);
        }
    }catch(err){
        console.log(err, 'pauseError');
    }
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function loop(musicList, interaction){
    //#region loop 循環函數
    try{
        if(!musicList) return interactionReply(interaction, `沒有音樂，會讓我克制不住衝動不斷跳針跳針跳針......`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `沒有音樂，會讓我克制不住衝動不斷跳針跳針跳針......`, true);
        musicList.isLoop = !musicList.isLoop;
        if(musicList.isLoop){return interaction.reply(`已將這首音樂設定為循環播放`);}
        else{return interaction.reply(`已取消循環播放這首音樂`);}
    }catch (err){
        console.log(err, 'loopError');
    }
}
//#endregion

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function loopqueue(musicList, interaction){
    //#region loopList 清單循環函數
    try{
        if(!musicList) return interactionReply(interaction, `看看你眼前這空如大海的清單。看來我沒有辦法循環它。`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `看看你眼前這空如大海的清單。看來我沒有辦法循環它。`, true);
        musicList.isLoopList = !musicList.isLoopList;
        if(musicList.isLoopList){return interaction.reply(`已將整個播放清單設定為循環播放`);}
        else{return interaction.reply(`已取消循環播放整個播放清單`);}
    }catch (err){
        console.log(err, 'loopListError');
    }
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function random(musicList, interaction){
    //#region random 播放清單隨機排序函數
    try{
        if(!musicList) return interactionReply(interaction, `沒有在清單中的音樂，要如何洗牌呢?`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `沒有在清單中的音樂，要如何洗牌呢?`, true);
        const song = musicList.songShift();
        musicList.songShuffle();
        musicList.songUnshift(song);
        interaction.reply(`音樂已隨機排序`);
    }catch(err){
        console.log(err, 'pauseError');
    }
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @returns 
 */
function skip(musicList, interaction){
    //#region skip 跳過單首函數
    try{
        if(!musicList) return interactionReply(interaction, `我剛剛跳過了......什麼都沒有?你是不是還沒開始播放音樂?`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `我剛剛跳過了......什麼都沒有?你是不是還沒開始播放音樂?`, true);
        if(musicList.isLoop && !musicList.isLoopList){musicList.songShift();}
        if(!musicList.isLoop && musicList.isLoopList){musicList.songShift();}
        if(musicList.isLoop && musicList.isLoopList){musicList.song.push(musicList.firstSong);musicList.songshift();}
        musicList.player.stop();
        interaction.reply(`跳過現在播放的音樂!`);
    }catch (err){
        console.log(err, 'skipError');
    }
}

/**
 * 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction  
 * @returns 
 */
function clearqueue(musicList, interaction){
    //#region skipList 清空整個清單函數
    try{
        if(!musicList) return interactionReply(interaction, `清單一貧如洗，看來不需要我刻意去清空它了。`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `清單一貧如洗，看來不需要我刻意去清空它了。`, true);
        musicList.reset();
        interaction.reply(`清空播放清單!`);
    }catch (err){
        console.log(err, 'skipError');
    }
}

/**
 * 
 * @param {number} from 
 * @param {number} to 
 * @param {music.MusicList} musicList 
 * @param {Discord.CommandInteraction} interaction 
 * @param {Discord.User} user 
 * @param {String} defprem 
 * @returns 
 */
 function removemusic(from, to, musicList, interaction){
    //#region removeMusic 移除音樂函數
    try{
        if(!musicList) return interactionReply(interaction, `清單是空的。我也找不到其中任何可以拔除的音樂。`, true);
        if(musicList.songlength <= 0) return interactionReply(interaction, `清單是空的。我也找不到其中任何可以拔除的音樂。`, true);

        if(musicList.songlength === 1) 
            return interactionReply(interaction, "清單看來是空的。如果要跳過現在的音樂，請使用 \`/music skip\` 指令。", true);
        if(from <= 0 || (from + to) > musicList.songlength || to <= 0){
            return interactionReply(interaction, `這張清單看來沒有如你想像般的那麼長。\n我可以移除的範圍：1~${musicList.songlength}`, true);
        }
        musicList.songSplice(from, to);
        interaction.reply(`已移除指定的音樂！`);
    }catch (err){
        console.log(err, 'skipError');
    }
}

/**
 * 
 * @param {Discord.CommandInteraction} interaction  
 * @returns 
 */
 function disconnect(interaction){
    //#region disconnect 段開連接函數
    try{
        //判斷bot是否在此群組的語音頻道
        if (!Voice.getVoiceConnection(interaction.guild.id)) return interactionReply(interaction, '不存在的語音，怎麼退呢?', true);
        //退出語音頻道
        Voice.getVoiceConnection(interaction.guild.id).destroy();
        return interaction.reply('退出播放程序...');
    }catch(err){
        console.log(err, 'disconnectError');
    }
}

/**
 * 
 * @param {Discord.CommandInteraction} interaction 
 * @param {steing} content 
 * @param {boolean} ephemeral 
 * @param {Array} ephemeral 
 */
function interactionReply(interaction, content, ephemeral, embed) {
    ephemeral ??= false;
    embed ??= [];
    if(interaction.replied) return interaction.editReply({content: content, embeds: embed});
    else return interaction.reply({content: content, ephemeral: ephemeral, embeds: embed});
}