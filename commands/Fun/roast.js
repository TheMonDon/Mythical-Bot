const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Roast extends Command {
  constructor (client) {
    super(client, {
      name: 'roast',
      description: 'Get a random roast message.',
      usage: 'roast',
      category: 'Fun',
      aliases: ['roasts'],
      guildOnly: false
    });
  }

  async run (msg, text) {
    delete require.cache[require.resolve('../../resources/messages/roasts.json')];
    const roasts = require('../../resources/messages/roasts.json');

    const num = Math.round(Math.random() * (roasts.length - 1)) + 1;

    const embed = new EmbedBuilder()
      .setTitle('Roasts')
      .setColor(msg.settings.embedColor)
      .setDescription(roasts[num])
      .setFooter({ text: `Reply #${num}` });

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Roast;
