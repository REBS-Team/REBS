const { Client, GatewayIntentBits } = require('discord.js');
const readline = require('readline');

// Create a new client instance with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Login to Discord with your app token
client.login('MTMzNjc4OTI3NjE2MzE3ODYwNw.G7Cwlp.aj5S1bdhKW5l0skM87jYBtRY9I0o0DLPyIxKqg');

// Setup readline to listen to terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Listen to terminal input
rl.on('line', async (input) => {
    if (input === 'send') {
        const channelId = '1260270990353498277';

        try {
            // Fetch the channel instead of using cache directly
            const channel = await client.channels.fetch(channelId);

            if (channel) {
                channel.send('Hello from the terminal!')
                    .then(() => console.log('Message sent to the channel'))
                    .catch(console.error);
            } else {
                console.error('Channel not found!');
            }
        } catch (error) {
            console.error('Error fetching the channel:', error);
        }
    } else {
        console.log(`Unknown command: ${input}`);
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log('Type "send" in the terminal to send a message to the Discord channel.');
});
