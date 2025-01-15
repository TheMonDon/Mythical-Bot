const Command = require('../../base/Command.js');

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

    msg.channel.send('Loading data...').then(async (message) => {
      const latency = message.createdTimestamp - msg.createdTimestamp;
      await message.edit(`🏓 Bot Latency is ${latency}ms. API Latency is ${wsPing}ms`);
    });
  }
}

module.exports = Ping;
