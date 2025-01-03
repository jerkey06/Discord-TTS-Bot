require('dotenv').config(); 
const{Client, GatewayIntentBits} = require('discord.js');
const {joinVoiceChannel, createAudioPlayer, createAudioResource} = require('@discordjs/voice') = require('@discordjs/voice');
const fs = require('fs'); 
const textToSpeech = require('@google-cloud/text-to-speech');

const ttsClient = new textToSpeech.TextToSpeechClient(); 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] 
});

client.login(process.env.DISCORD_TOKEN); 

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
    if ( !message.content.startsWith('/habla')|| message.author.bot) return;
     const text = message.content.replace('/habla', '').trim();
     if (!text) {
        message.reply('Please provide a text to be converted to speech.');
        return;
     }

     const voiceChannel = message.member.voice.channel;
     if (!voiceChannel) {
        message.reply('You need to be in a voice channel to use this command.');
        return;
     }

     try {
        const request = {
            input: { text },
            voice: { lenguageCode: 'en-US'},
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioPath = 'audio.mp3';
        fs.writeFileSync(audioPath, response.adioContenet);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(audioPath);
        connection.subscribe(player);
        player.play(resource);
        
        player.on('idle', () => {
            connection.destroy();
            fs.unlinkSync(audioPath);
        });

        message.reply('Text to speech conversion started.');
        } catch (error) {
            console.error(error);
            message.reply('An error occurred while converting text to speech.');
        }
});