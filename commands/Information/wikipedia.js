const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class Wikipedia extends Command {
  constructor(client) {
    super(client, {
      name: 'wikipedia',
      description: 'Retrieve an article from wikipedia',
      usage: 'wikipedia <Search>',
      requiredArgs: 1,
      category: 'Information',
      aliases: ['wiki'],
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

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
    if (body.query.pages[0].missing) return msg.channel.send('No results found for that search.');

    const str = body.query.pages[0].extract.replace(/[\n]/g, '\n\n');

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(body.query.pages[0].title)
      .setAuthor({
        name: 'Wikipedia',
        iconURL:
          'https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/2244px-Wikipedia-logo-v2.svg.png',
      })
      .setDescription(str.length > 3095 ? str.substr(0, 3090) + ' ...' : str);

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = Wikipedia;
