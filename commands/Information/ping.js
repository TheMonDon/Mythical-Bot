const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class Ping extends Command {
  constructor (client) {
    super(client, {
      name: 'ping',
      description: 'Latency and API response times',
      usage: 'ping',
      category: 'Information',
      aliases: ['pong']
    });
  }

  async run (msg) { // eslint-disable-line no-unused-vars
    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Bot Ping')
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setDescription(`🏓 The bots ping is: **${Math.round(this.client.ws.ping)}**ms`)
      .setTimestamp();
    msg.channel.send(embed);
  }
}

module.exports = Ping;
