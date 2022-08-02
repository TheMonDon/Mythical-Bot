const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const gplay = require('google-play-scraper');

class GooglePlay extends Command {
  constructor (client) {
    super(client, {
      name: 'google-play',
      description: 'Get some information about any Google Play application.',
      usage: 'google-play <app>',
      category: 'Search',
      aliases: ['gplay', 'g-play', 'googleplay']
    });
  }

  async run (msg, text) {
    const term = text.join(' ');

    gplay.search({
      term,
      num: 1,
      fullDetail: true
    })
      .then(result => {
        const res = result?.[0];
        if (!res) return msg.channel.send('I could not find any app with that name.');

        const em = new EmbedBuilder()
          .setTitle(res.title)
          .setDescription(res.summary)
          .setURL(res.url)
          .setColor('#0099CC')
          .setThumbnail(res.icon)
          .addFields([
            { name: 'Developer', value: res.developer || 'Unknown' },
            { name: 'Price', value: res.priceText || 'Unknown' },
            { name: 'Rating', value: res.scoreText || 'Unknown' },
            { name: 'Genre', value: res.genre || 'Unknown' },
            { name: 'Installs', value: res.maxInstalls ? res.maxInstalls.toLocaleString() + '+' : 'Unknown' },
            { name: 'Released On', value: res.released || 'Unknown' }
          ]);
        return msg.channel.send({ embeds: [em] });
      })
      .catch(() => {
        return msg.channel.send('I could not find any app with that name.');
      });
  }
}
module.exports = GooglePlay;
