const Command = require('../../base/Command.js');
const fetch = require('node-superfetch');
const DiscordJS = require('discord.js');

class Advice extends Command {
  constructor (client) {
    super(client, {
      name: 'advice',
      description: 'Get a random piece of advice.',
      usage: 'advice',
      category: 'Fun',
      aliases: ['num']
    });
  }

  async run (msg) {
    let { body } = await fetch
      .get('https://api.adviceslip.com/advice')
      .catch(() => {
        return msg.channel.send('Something went wrong, please try again in a few moments.');
      });
    if (!body) return;

    body = JSON.parse(body.toString());

    const em = new DiscordJS.MessageEmbed()
      .setTitle(body.slip.advice)
      .setColor('RANDOM')
      .setFooter({ text: `ID: ${body.slip.id}` });
    return msg.channel.send({ embeds: [em] });
  }
}
module.exports = Advice;
