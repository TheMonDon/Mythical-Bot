const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class Steam extends Command {
  constructor (client) {
    super(client, {
      name: 'steam',
      description: 'Get some information about any steam game or application.',
      usage: 'steam <game/app>',
      category: 'Search'
    });
  }

  async run (msg, text) {
    const query = text.join(' ');

    if (!text || text.length < 1) {
      const em = new DiscordJS.MessageEmbed()
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

    const embed = new DiscordJS.MessageEmbed()
      .setColor(0x101D2F)
      .setAuthor('Steam', 'https://i.imgur.com/xxr2UBZ.png', 'http://store.steampowered.com/')
      .setTitle(data.name)
      .setURL(`http://store.steampowered.com/app/${data.steam_appid}`)
      .setImage(tinyImage)
      .addField('❯\u2000Price', `•\u2000 ${price}`, true)
      .addField('❯\u2000Metascore', `•\u2000 ${data.metacritic ? data.metacritic.score : '???'}`, true)
      .addField('❯\u2000Recommendations', `•\u2000 ${data.recommendations ? data.recommendations.total : '???'}`, true)
      .addField('❯\u2000Platforms', `•\u2000 ${platforms.join(', ') || 'None'}`, true)
      .addField('❯\u2000Release Date', `•\u2000 ${data.release_date ? data.release_date.date : '???'}`, true)
      .addField('❯\u2000DLC Count', `•\u2000 ${data.dlc ? data.dlc.length : 0}`, true)
      .addField('❯\u2000Developers', `•\u2000 ${data.developers ? data.developers.join(', ') || '???' : '???'}`, true)
      .addField('❯\u2000Publishers', `•\u2000 ${data.publishers ? data.publishers.join(', ') || '???' : '???'}`, true);

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = Steam;
