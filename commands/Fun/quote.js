const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class quote extends Command {
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

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Random Quote')
      .setColor('RANDOM')
      .addField('Author', quote.author)
      .addField('Quote', quote.text)
      .setAuthor(msg.author.username, msg.author.displayAvatarURL());

    return msg.channel.send(em);
  }
}
module.exports = quote;
