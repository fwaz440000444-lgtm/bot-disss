
const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    getVoiceConnection,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// بيانات البوت والمعرفات
const VOICE_CHANNEL_ID = '1448125272816881778';
const BOT_TOKEN = 'YOUR_DISCORD_TOKEN'; // استبدل هذا بتوكن البوت الخاص بك

const player = createAudioPlayer();

player.on('error', error => {
    console.error(`❌ Audio Player Error: ${error.message}`);
});

player.on(AudioPlayerStatus.Playing, () => {
    console.log("🔊 البوت يعزف الصوت الآن داخل الروم الصوتية!");
});

// دالة الدخول وتثبيت الاتصال بالروم
async function joinAndHoldVoiceChannel() {
    try {
        const channel = await client.channels.fetch(VOICE_CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isVoiceBased()) return;

        let connection = getVoiceConnection(channel.guild.id);
        if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
                group: client.user ? client.user.id : 'default'
            });
            
            connection.subscribe(player);
            console.log(`✅ البوت متصل بالروم الصوتية 24/7: ${channel.name}`);

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                setTimeout(joinAndHoldVoiceChannel, 3000);
            });
        }
    } catch (e) {
        console.error(`❌ Error Joining Voice: ${e.message}`);
        setTimeout(joinAndHoldVoiceChannel, 5000);
    }
}

client.once('clientReady', async () => {
    try {
        const clientID = await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: clientID } });
        console.log("⚡ تم تهيئة مشغل SoundCloud بنجاح.");
    } catch (e) {
        console.log("تنبيه في تهيئة المشغل:", e.message);
    }

    console.log('-----------------------------------');
    console.log(`📡 البوت جاهز بالكامل باسم: ${client.user.tag}`);
    console.log('-----------------------------------');

    await joinAndHoldVoiceChannel();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== VOICE_CHANNEL_ID) return;
    if (!message.member.voice.channel || message.member.voice.channel.id !== VOICE_CHANNEL_ID) return;

    let text = message.content.trim();

    // معالجة الأوامر المعكوسة تلقائياً
    if (text.endsWith(" ش")) {
        text = "ش " + text.slice(0, -2).trim();
    }

    const stopWords = ["ش وقف", "ش ايقاف", "ش stop", "ش ستوب", "وقف"];
    if (stopWords.includes(text)) {
        if (player.status === AudioPlayerStatus.Playing) {
            player.stop();
            await message.channel.send("⏹️ تم إيقاف التشغيل.");
        } else {
            await message.channel.send("لا يوجد شيء قيد التشغيل حالياً.");
        }
        return;
    }

    let searchQuery = "";
    if (text.startsWith("ش ")) searchQuery = text.slice(2).trim();
    else if (text.startsWith("ش") && text.length > 1) searchQuery = text.slice(1).trim();
    else return;

    if (!searchQuery || ["وقف", "ايقاف", "stop", "ستوب"].includes(searchQuery)) return;

    await message.channel.send(`🔎 جاري البحث وتشغيل: **${searchQuery}** ...`);

    try {
        let connection = getVoiceConnection(message.guild.id);
        if (!connection) await joinAndHoldVoiceChannel();

        // البحث عبر SoundCloud لتجاوز حظر يوتيوب
        const scResults = await play.search(searchQuery, { limit: 1, source: { soundcloud: 'tracks' } }).catch(() => null);

        if (!scResults || scResults.length === 0) {
            await message.channel.send("❌ لم يتم العثور على المقطع.");
            return;
        }

        const track = scResults[0];
        const streamData = await play.stream(track.url);

        const resource = createAudioResource(streamData.stream, {
            inputType: streamData.type
        });

        player.play(resource);
        await message.channel.send(`🎵 يتم الآن التشغيل: **${track.name}**`);

    } catch (error) {
        await message.channel.send("❌ حدث خطأ أثناء جلب المقطع الصوتية.");
        console.error("تفاصيل الخطأ:", error);
    }
});

client.login('MTU0MTU4MjQ4NTg1NzY0MDQ1OQ.GkNiPH.DHUD_3UN8d7pW6MwuHIXuo9j89J7pMycAEfwV0');
