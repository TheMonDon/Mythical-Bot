const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class wiki extends Command {
  constructor (client) {
    super(client, {
      name: 'wikipedia',
      description: 'Retrieve an article from wikipedia',
      usage: 'wikipedia',
      category: 'Information',
      aliases: ['wiki']
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;
    const query = text.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}wiki <wikipedia search>`);

    const { body } = await fetch
      .get('https://en.wikipedia.org/w/api.php')
      .query({
        action: 'query',
        prop: 'extracts',
        format: 'json',
        titles: query,
        exintro: '',
        explaintext: '',
        redirects: '',
        formatversion: 2
      });
    if (body.query.pages[0].missing) return msg.channel.send('No Results.');

    const str = body.query.pages[0].extract.replace(/[\n]/g, '\n\n');

    const embed = new DiscordJS.MessageEmbed()
      .setColor(0x00A2E8)
      .setTitle(body.query.pages[0].title)
      .setAuthor('Wikipedia', 'https://i.imgur.com/a4eeEhh.png')
      .setDescription((str.length > 2043) ? str.substr(0, 2040) + ' ...' : str);
    return msg.channel.send({embeds: [embed]});
  }
}
module.exports = wiki;
