const configuration = {
  token: process.env.DISCORD_TOKEN
};

// Load discord.js to read info about the server
const Discord = require('discord.js');
const client = new Discord.Client();
client.login(configuration.token);

console.log('bot loaded')
// require("fs")
//   .readdirSync(normalizedPath)
//   .forEach(function(file) {
//     require("./skills/" + file)(discordBot, client, Discord);
//   });