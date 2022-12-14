const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Quote extends Command {
  constructor (client) {
    super(client, {
      name: 'quote',
      description: 'Get a random quote.',
      usage: 'quote',
      category: 'Fun',
      aliases: ['quotes']
    });
  }

  async run (msg) {
    const fs = require('fs');
    const jsonQuotes = fs.readFileSync(
      './resources/messages/motivational_quotes.json',
      'utf8'
    );
    const quoteArray = JSON.parse(jsonQuotes);

    const quote = quoteArray[Math.floor(Math.random() * quoteArray.length)];

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Random Quote')
      .setColor(msg.settings.embedColor)
      .addFields([
        { name: 'Author', value: quote.author },
        { name: 'Quote', value: quote.text }
      ]);

    return msg.channel.send({ embeds: [em] });
  }
}
module.exports = Quote;
