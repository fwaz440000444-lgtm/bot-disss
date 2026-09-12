const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// 🔴 ضع ID الروم الصوتية الخاصة بهذا البوت
const VOICE_CHANNEL_ID = '1448125272816881778';
const player = createAudioPlayer();

client.once('ready', async () => {
    console.log('-----------------------------------');
    console.log(`📡 البوت شغال الآن باسم: ${client.user.tag}`);
    console.log('-----------------------------------');

    const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
    if (channel && channel.isVoiceBased()) {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true
            });
            connection.subscribe(player);
            console.log(`✅ نجح البوت في الدخول إلى الروم: ${channel.name}`);
        } catch (error) {
            console.error(`❌ فشل الاتصال بالروم الصوتية: ${error}`);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const connection = getVoiceConnection(message.guild.id);
    
    if (!connection) return;
    if (message.channel.id !== VOICE_CHANNEL_ID) return;
    if (!message.member.voice.channel || message.member.voice.channel.id !== VOICE_CHANNEL_ID) return;

    const text = message.content.trim();

    const stopWords = ["ش وقف", "ش ايقاف", "ش stop", "ش ستوب", "وقف"];
    if (stopWords.includes(text)) {
        if (player.status === AudioPlayerStatus.Playing) {
            player.stop();
            await message.channel.send("⏹️ تم إيقاف التشغيل بنجاح.");
        } else {
            await message.channel.send("لا يوجد شيء قيد التشغيل حالياً.");
        }
        return;
    }

    let searchQuery = "";
    if (text.startsWith("ش ")) {
        searchQuery = text.slice(2).trim();
    } else if (text.startsWith("ش") and text.length > 1) {
        searchQuery = text.slice(1).trim();
    } else {
        return;
    }

    if (!searchQuery || ["وقف", "ايقاف", "stop", "ستوب"].includes(searchQuery)) return;

    await message.channel.send(`🔎 جاري البحث عن: **${searchQuery}** ...`);

    try {
        // البحث عبر SoundCloud لتجاوز حظر يوتيوب على الاستضافات
        let searchResult = await play.search(searchQuery, { limit: 1, source: { soundcloud: 'tracks' } });
        
        // في حال عدم وجود نتيجة بالساوندكلاود يجرب البحث العام
        if (!searchResult || searchResult.length === 0) {
            searchResult = await play.search(searchQuery, { limit: 1 });
        }

        if (!searchResult || searchResult.length === 0) {
            await message.channel.send("❌ لم يتم العثور على أي نتائج.");
            return;
        }

        const stream = await play.stream(searchResult[0].url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });

        player.play(resource);
        await message.channel.send(`🎵 يتم الآن تشغيل: **${searchResult[0].title}**`);
    } catch (error) {
        await message.channel.send("❌ حدث خطأ أثناء جلب أو تشغيل المقطع الصوتي.");
        console.error(`Error Details: ${error}`);
    }
});


client.login('MTU0MTU4MjQ4NTg1NzY0MDQ1OQ.GnFAtK.64rzwpmM2GDar3DFzgWx6l8SqIBBHgfBI5feLY');