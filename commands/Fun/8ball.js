const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const NekoLife = require('nekos.life');
const neko = new NekoLife();

class EightBall extends Command {
  constructor (client) {
    super(client, {
      name: '8ball',
      description: 'Ask the 8ball something.',
      usage: '8ball <Question>',
      category: 'Fun'
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.reply('You have to actually state your question.');

    const question = args.join(' ');

    const out = await neko.eightBall({ text: question });

    const em = new EmbedBuilder()
      .setTitle('Eight Ball')
      .setColor(msg.settings.embedColor)
      .setImage(out.url)
      .addFields([
        { name: '__Question:__', value: question, inline: false }
      ]);
    return msg.channel.send({ embeds: [em] });
  }
}
module.exports = EightBall;
