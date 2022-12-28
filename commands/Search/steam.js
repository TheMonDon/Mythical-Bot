const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');
const { clean } = require('../../util/Util.js');

class Steam extends Command {
  constructor (client) {
    super(client, {
      name: 'steam',
      description: 'Get some information about any steam game or application.',
      usage: 'Steam <Game/App>',
      category: 'Search'
    });
  }

  async run (msg, text) {
    const query = await clean(this.client, text.join(' '));

    if (!text || text.length < 1) {
      const em = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setTitle('Please provide something to search for')
        .setDescription(`Incorrect Usage: ${msg.settings.prefix}steam <game/app>`)
        .setTimestamp();
      return msg.channel.send({ embeds: [em] });
    }

    const search = await fetch
      .get('https://store.steampowered.com/api/storesearch')
      .query({
        cc: 'us',
        l: 'en',
        term: query
      });

    if (!search.body.items.length) return msg.channel.send(`No results found for **${query}**!`);

    const { id, tinyImage } = search.body.items[0];

    const { body } = await fetch
      .get('https://store.steampowered.com/api/appdetails')
      .query({
        appids: id
      });

    const { data } = body[id.toString()];

    const final = data.price_overview?.final_formatted || '$0';
    const initial = data.price_overview?.initial_formatted || '$0';

    const price = (initial !== '$0') ? `~~${initial}~~ ${final} ${data.price_overview?.discount_percent || 0}% off` : final;

    const platforms = [];
    if (data.platforms?.windows) platforms.push('Windows');
    if (data.platforms?.mac) platforms.push('Mac');
    if (data.platforms?.linux) platforms.push('Linux');

    const embed = new EmbedBuilder()
      .setColor(0x101D2F)
      .setAuthor({ name: 'Steam', iconURL: 'https://i.imgur.com/xxr2UBZ.png', url: 'http://store.steampowered.com/' })
      .setTitle(data.name)
      .setURL(`http://store.steampowered.com/app/${data.steam_appid}`)
      .setImage(tinyImage)
      .addFields([
        { name: '❯ Price', value: `•\u2000 ${price}`, inline: true },
        { name: '❯ Metascore', value: `•\u2000 ${data.metacritic ? data.metacritic.score : 'Unknown'}`, inline: true },
        { name: '❯ Recommendations', value: `•\u2000 ${data.recommendations ? data.recommendations.total : 'Unknown'}`, inline: true },
        { name: '❯ Platforms', value: `•\u2000 ${platforms.join(', ') || 'None'}`, inline: true },
        { name: '❯ Release Date', value: `•\u2000 ${data.release_date ? data.release_date.date : 'Unknown'}`, inline: true },
        { name: '❯ DLC Count', value: `•\u2000 ${data.dlc ? data.dlc.length : 0}`, inline: true },
        { name: '❯ Developers', value: `•\u2000 ${data.developers?.join(', ') || 'Unknown'}`, inline: true },
        { name: '❯ Publishers', value: `•\u2000 ${data.publishers?.join(', ') || 'Unknown'}`, inline: true }
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = Steam;
