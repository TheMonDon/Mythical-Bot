const Command = require('../../base/Command.js');
const fetch = require('node-superfetch');
const { EmbedBuilder } = require('discord.js');

class Number extends Command {
  constructor (client) {
    super(client, {
      name: 'number',
      description: 'Get a random fact about a number.',
      usage: 'Number <number>',
      category: 'Fun',
      aliases: ['num']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Number <number>`);

    const { body } = await fetch
      .get(`http://numbersapi.com/${args.join(' ')}`)
      .catch(() => {
        return msg.channel.send('I could not find any information about that number.');
      });
    if (!body) return;

    const em = new EmbedBuilder()
      .setTitle(body.toString())
      .setColor('#0099CC');
    return msg.channel.send({ embeds: [em] });
  }
}
module.exports = Number;
