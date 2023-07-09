const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class Wikipedia extends Command {
  constructor(client) {
    super(client, {
      name: 'wikipedia',
      description: 'Retrieve an article from wikipedia',
      usage: 'wikipedia',
      category: 'Information',
      aliases: ['wiki'],
    });
  }

  async run(msg, text) {
    const query = text.join(' ');
    if (!query || query.length < 1)
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}wiki <wikipedia search>`);

    const { body } = await fetch.get('https://en.wikipedia.org/w/api.php').query({
      action: 'query',
      prop: 'extracts',
      format: 'json',
      titles: query,
      exintro: '',
      explaintext: '',
      redirects: '',
      formatversion: 2,
    });
    if (body.query.pages[0].missing) return msg.channel.send('No results were found.');

    const str = body.query.pages[0].extract.replace(/[\n]/g, '\n\n');

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(body.query.pages[0].title)
      .setAuthor({ name: 'Wikipedia', iconURL: 'https://i.imgur.com/a4eeEhh.png' })
      .setDescription(str.length > 3095 ? str.substr(0, 3090) + ' ...' : str);

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = Wikipedia;
