const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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

  async run (msg) {
    const embed = new EmbedBuilder()
      .setTitle('Bot Ping')
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`🏓 The bots ping is: **${Math.round(this.client.ws.ping)}**ms`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Ping;
