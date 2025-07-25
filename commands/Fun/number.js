const Command = require('../../base/Command.js');
const fetch = require('node-superfetch');
const { EmbedBuilder } = require('discord.js');

class Number extends Command {
  constructor(client) {
    super(client, {
      name: 'number',
      description: 'Get a random fact about a number',
      usage: 'number <number>',
      requiredArgs: 1,
      category: 'Fun',
      aliases: ['num'],
    });
  }

  async run(msg, args) {
    let error = false;
    const body = await fetch.get(`http://numbersapi.com/${args.join(' ')}`).catch(() => {
      error = true;
    });

    if (error) {
      return this.client.util.errorEmbed(msg, 'I could not find any information about that number.');
    }

    const embed = new EmbedBuilder().setTitle(body.body.toString()).setColor(msg.settings.embedColor);

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = Number;
