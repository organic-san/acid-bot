const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('幫助清單')
        .addStringOption(opt => 
            opt.setName('option')
            .setDescription('要查詢的指令種類')
            .setRequired(true)
            .addChoice("基本指令(系統說明、其他指令說明)", "basic")
            .addChoice("更新資訊", "update")
            .addChoice("遊戲類", "game")
            .addChoice("音樂系統", "music")
            .addChoice("機器人回應", "response")
            .addChoice("每日單字系統", "words")
            .addChoice("自動回應系統", "auto-reply")
            .addChoice("等級排行系統", "levels")
            .addChoice("歡迎/送別訊息", "welcome")
        ),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const option = interaction.options.getString('option');

        if (option === 'basic') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/basic(基本說明)`)
                .setDescription(`關於${interaction.client.user.tag}的基本功能`)
                .addField(`基本指令`,
                    "\`/account birthday [user:用戶]\` - 找尋用戶創建帳號的日子\n" + 
                    "\`/account avatar [user:用戶] [size:尺寸]\` - 產生用戶頭像的網址\n" + 
                    "\`/information bot\` - 查詢我的資料\n" + 
                    "\`/information guild\` - 查詢伺服器的資料\n" + 
                    "\`/information user <user:用戶>\` - 查詢該用戶的資料\n" + 
                    "\`/poll create <title:標題> [description:內文] [option:選項]\` - 建立投票\n" + 
                    "\`/poll sum <message-id:訊息ID>\` - 截計投票結果\n" + 
                    "\`/anonymous <message:訊息>\` - 匿名發送訊息\n" + 
                    "\`/record <message-id:訊息ID> [channel:頻道]\` - 回顧一則訊息\n" + 
                    `\`/timer [hour:小時] [min:分鐘] [sec:秒] [message:提醒訊息]\` - 計時器\n` +
                    "\`/happy-birthday <user:用戶>\` - 發送生日快樂訊息給該用戶\n" + 
                    `\`/generator fat-nerd-style <text:內文>\` - 肥宅文體產生器!\n`)
                .addField(`其他系統性的指令`, 
                    "以下指令的詳細說明，可以在/help後選擇其他模式以取得說明\n\n" + 
                    "\`/levels\` - 等級排行系統\n" + 
                    "\`/auto-reply\` - 自動回應系統\n" + 
                    "\`/welcome-message\` - 歡迎訊息/送別訊息系統\n" + 
                    "\`/music\` - 音樂系統\n" + 
                    "\`/game\` - 遊戲相關功能" +
                    "\`/response\` - 機器人回應\n" + 
                    "\`/words\` - 每日單字系統")
                .addField("表情符號轉換功能", 
                    "如果想要在訊息中加入動畫/別群的表情符號，但是卻沒有Discord-Nitro，\n" + 
                    "只要輸入表情符號的名稱，機器人就會將你的發言自動轉換成包含表情符號的訊息!\n" + 
                    "例如: 只要輸入 \`:acidbot:\`，就會自動將訊息轉換轉換成 <:acidbot:896709436163375114>")
                .addField("內建關鍵字反應功能", 
                    "部分關鍵字機器人也會反應\n分別為: \`笑死\`、\`快樂光線\`、\`龜雞奶\`")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});

        } else if (option === 'update') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/update(最近更新)`)
                .setDescription(`來看看有機酸又加了什麼東西!`)
                .addField("新增肥宅文體產生器!", 
                    "\`/generator fat-nerd-style <text:內文>\`\n" + 
                    "將自動轉換您輸入的言論，並轉譯成肥宅體\n" + 
                    "是非常方便的功能。(燦笑")
                .addField("計時器回來了!", 
                    "\`/timer [hour:小時] [min:分鐘] [sec:秒] [message:提醒訊息]\`\n")
                .addField("歡迎訊息回來了!", 
                    "\`/welcome-message\` 或者查看/help welcome-message以取得完整資訊\n")
                .addField("圈圈叉叉!", 
                    "\`/tic-tac-toe\`\n")
                .addField("猜數字!", 
                    "\`/guess-number\`\n")
                .addField("剔除非斜線的指令",
                    "將於近期之內無法再使用原先的指令，大部分都已轉換完畢，請注意。")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});
            
        } else if (option === 'auto-reply') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/auto-reply(自動回應系統)`)
                .setDescription(`關於自動回應系統: 可以讓機器人自動與成員互動。\n` +
                    `如果將自動回應的文自設定為 \`快樂光線\` :\n` +
                    `那麼，當用戶輸入 \`快樂光線\` 時，\n` +
                    `機器人將自動回應 \`(/  ≧▽≦)/==============))\`\n` +
                    `<此為必填項> [此為選填項]`)
                .addField(`基本指令`, 
                    `\`/auto-reply show\` - 顯示機器人會自動回應的文字清單語查詢ID`)
                .addField("需要伺服器管理權限的指令", 
                    "\`/auto-reply add <trigger-message:文字> <reply-message:文字> <mode:模式>\` - 新增自動回應的項目\n" + 
                    "\`/auto-reply remove <auto-reply-id:數字>\` - 刪除特定回應的項目\n" + 
                    "\`/auto-reply reset\` - 清空所有回應項目")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});

        } else if (option === 'levels') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/levels(等級系統)`)
                .setDescription(`關於等級系統: 專屬於伺服器的個人等級排名系統\n由發送訊息數量決定等級\n` +
                    `<此為必填項> [此為選填項]`)
                .addField("基本指令", 
                    `\`/levels rank [user:用戶]\` - 查看自己或對象的等級\n` +
                    `\`/levels ranking\` - 查看整個伺服器的排行\n` +
                    `\`/levels noDM\` - 停止/開啟該伺服器中，給自己的的升等訊息私訊`)
                .addField("需要伺服器管理權限的指令", 
                    "\`/levels show\` - 顯示目前的設定檔\n" + 
                    "\`/levels open\` - 開啟等級系統\n" + 
                    "\`/levels close\` - 關閉等級系統\n" + 
                    "\`/levels reset\` - 將所有人的等級系統歸零\n" + 
                    "\`/levels level-up-react <mode:狀態> [channel:頻道]\` - 調整回應模式")
                .addField('回應模式說明', 
                    `\`MessageChannel\` - 在用戶發送訊息的頻道發送升等訊息(預設模式)\n` + 
                    `\`SpecifyChannel\` - 在指定的頻道發送升等訊息\n` + 
                    `\`DMChannel\` - 機器人會直接私訊用戶告知升等訊息\n` + 
                    `\`NoReact\` - 不發送升等訊息\n`)
                .addField('頻道ID是什麼?', '\"使用者設定->進階->開啟開發者模式\"\n' +
                    '(行動版： \"使用者設定->行為->開啟開發者模式\" )\n' +
                    '之後，右鍵/長按頻道時最下方會有個 \"複製ID\" 選項\n可以使用此方法複製頻道ID\n'+
                    '通常頻道ID會長得像這樣：123456789012345678')
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});

        } else if (option === 'music') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/music(音樂播放系統)`)
                .setDescription(`關於等級系統: 專屬於伺服器的個人等級排名系統\n由發送訊息數量決定等級\n` +
                    `<此為必填項> [此為選填項]`)
                .addField("播放指令", 
                    `\`/music play [music-url-or-title:標題或網址]\` - 撥放音樂，並讓機器人加入語音頻道\n` +
                    `\`/music disconnect\` - 中斷機器人的連接\n` +
                    "\`/music skip\` - 跳過目前播放的音樂\n" + 
                    `\`/music replay\` - 重新播放目前的音樂\n` +
                    "\`/music pause\` - 暫停/取消暫停音樂\n" + 
                    `\`/music clearqueue\` - 清空整個播放清單\n`)
                .addField("資訊顯示指令", 
                    "\`/music nowplaying\` - 顯示現在播放的音樂資訊\n" + 
                    "\`/music queue\` - 顯示目前的音樂清單\n")
                .addField("播放清單操作指令", 
                    "\`/music remove <from:音樂編號> [amount:數量]\` - 移除指定排序的音樂\n" + 
                    "\`/music loop\` - 循環播放目前的音樂\n" + 
                    "\`/music loopqueue\` - 循環播放整個播放清單" +
                    "\`/music random\` - 隨機洗牌目前的播放清單")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});

        } else if (option === 'response') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/response(機器人回應)`)
                .setDescription(`機器人回應: 召喚某些回應，適用於各種社交應酬場合\n` +
                    `<此為必填項> [此為選填項]`)
                .addField("基本指令", 
                    `\`/response happybeam\` - 由機器人送你一道快樂光線======)\n` +
                    `\`/response goodnight\` - 晚上了，和你說晚安.:｡+゜｡\n` + 
                    `\`/response up-crazy-night <floor:樓數>\` - 向上面的訊息貼上🐢🐔🥛\n` +
                    `\`/response crazy-night-remove <floor:樓數>\` - 清除機器人發射的🐢🐔🥛\n`)
                .addField('🐢🐔🥛是什麼?', 'crazy night')
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});

        } else if (option === 'words') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/word(每日單字系統)`)
                .setDescription(`關於每日單字系統: 專用於學測的英文單字產生器\n` +
                    `<此為必填項> [此為選填項]`)
                .addField("基本指令", 
                    `\`/words searth <word:單字>\` - 搜尋該單字，請使用該單字的原型\n` +
                    `\`/words daily [amount:數量] [rank-limit-low:下等級限制] [rank-limit-high:上等級限制]\` - 產生每日單日列表，隔日更換\n`)
                .addField('資料是哪裡來的?', '[台灣測驗中心](http://www.taiwantestcentral.com/WordList/WordListByName.aspx?MainCategoryID=25&Letter=A)')
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});
        } else if (option === 'welcome') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/welcome(歡迎與送別訊息)`)
                .setDescription(`關於歡迎與送別訊息系統: 每當有人進來/送別，機器人就會發送一則訊息以示歡迎/惋惜\n` +
                    `<此為必填項> [此為選填項]`)
                .addField("基本指令", 
                    `\`/welcome-message set channel <type:設定範圍> <channel:頻道>\` - 設定要發送訊息的頻道\n` +
                    `\`/welcome-message set message <type:設定範圍> <message:內容>\` - 設定要發送的訊息\n` +
                    `\`/welcome-message open <type:設定範圍>\` - 開啟歡迎或送別訊息\n` +
                    `\`/welcome-message close <type:設定範圍>\` - 關閉歡迎或送別訊息\n` +
                    `\`/welcome-message show\` - 顯示目前的設定\n`)
                .addField("預設模板(沒有設定訊息時將使用此版本)", 
                    "歡迎預設訊息: \`<user> ，歡迎來到 <server> !\`\n送別預設訊息: \`<user> 已遠離我們而去。\`\n")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});
        } else if (option === 'game') {
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`指令幫助清單/game(遊戲功能)`)
                .setDescription(`<此為必填項> [此為選填項]`)
                .addField("基本指令", 
                    "\`/paper-scissors-stone <gesture:出拳>\` - 和機器人猜個拳\n" +
                    "\`/tic-tac-toe <difficulty:難度>\` - 和機器人玩一場井字遊戲\n" +
                    "\`/guess-number <range:數目> <is-recurring:是否重複>\` - 來一局猜數字遊戲\n" +
                    "\`/dice <side:面數> [count:顆數]\` - 丟一顆骰子，結果將隨機產生\n")
                .addField(`加入有機酸伺服器`,`如果有任何問題或需求，麻煩請[點擊加入伺服器](https://discord.gg/hveXGk5Qmz)並聯絡organic_san_2#0500\n`)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            interaction.reply({embeds: [embed]});
        } 
    }
};