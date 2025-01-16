const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Ping extends Command {
  constructor(client) {
    super(client, {
      name: 'ping',
      description: "Shows the bot's ping",
      usage: 'ping',
      category: 'General',
    });
  }

  async run(msg) {
    const wsPing = Math.round(this.client.ws.ping).toLocaleString();

    const reply = await msg.channel.send('Loading data...');

    const embed = new EmbedBuilder().setTitle('Ping').addFields([
      {
        name: 'Bot Latency',
        value: `${reply.createdTimestamp - msg.createdTimestamp}ms`,
        inline: true,
      },
      {
        name: 'API Latency',
        value: `${wsPing}ms`,
        inline: true,
      },
    ]);

    return reply.edit({ content: '', embeds: [embed] });
  }
}

module.exports = Ping;
