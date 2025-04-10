require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const textToSpeech = require('@google-cloud/text-to-speech');

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('/habla') || message.author.bot) return;

    const text = message.content.replace('/habla', '').trim();
    if (!text) {
        await message.reply('Por favor, proporciona un texto para convertir a voz.');
        return;
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        await message.reply('Necesitas estar en un canal de voz para usar este comando.');
        return;
    }

    try {
        // Configure TTS request
        const request = {
            input: { text },
            voice: { 
                languageCode: 'es-ES',
                name: 'es-ES-Standard-A'
            },
            audioConfig: { 
                audioEncoding: 'MP3',
                pitch: 0,
                speakingRate: 1
            },
        };

        // Generate speech
        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioPath = `./audio_${Date.now()}.mp3`;
        fs.writeFileSync(audioPath, response.audioContent);

        // Join voice channel
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        // Create and play audio
        const player = createAudioPlayer();
        const resource = createAudioResource(audioPath);
        
        connection.subscribe(player);
        player.play(resource);

        await message.reply('¡Reproduciendo mensaje!');

        // Handle audio player events
        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            fs.unlinkSync(audioPath);
        });

        player.on('error', (error) => {
            console.error('Error playing audio:', error);
            connection.destroy();
            fs.unlinkSync(audioPath);
            message.channel.send('Ocurrió un error al reproducir el audio.');
        });

    } catch (error) {
        console.error('Error in TTS conversion:', error);
        await message.reply('Ocurrió un error al convertir el texto a voz.');
    }
});

// Error handling for the Discord client
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error);
});