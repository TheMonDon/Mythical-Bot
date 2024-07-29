const Command = require('../../base/Command.js');
const fetch = require('node-superfetch');
const { EmbedBuilder } = require('discord.js');

class Advice extends Command {
  constructor(client) {
    super(client, {
      name: 'advice',
      description: 'Get a random piece of advice',
      usage: 'advice',
      category: 'Fun',
    });
  }

  async run(msg) {
    let { body } = await fetch.get('https://api.adviceslip.com/advice').catch(() => {
      return msg.channel.send('Something went wrong, please try again in a few moments.');
    });
    if (!body) return msg.channel.send('Something went wrong, please try again in a few moments.');

    body = JSON.parse(body.toString());

    const em = new EmbedBuilder()
      .setTitle(body.slip.advice)
      .setColor(msg.settings.embedColor)
      .setFooter({ text: `ID: ${body.slip.id}` });
    return msg.channel.send({ embeds: [em] });
  }
}
module.exports = Advice;
