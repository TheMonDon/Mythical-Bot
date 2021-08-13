const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const gplay = require('google-play-scraper');

class gPlay extends Command {
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

        const em = new DiscordJS.MessageEmbed()
          .setTitle(res.title)
          .setDescription(res.summary)
          .setURL(res.url)
          .setColor('#0099CC')
          .setThumbnail(res.icon)
          .addField('Developer', res.developer || 'Unknown', true)
          .addField('Price', res.priceText || 'Unknown', true)
          .addField('Rating', res.scoreText || 'Unknown', true)
          .addField('Genre', res.genre || 'Unknown', true)
          .addField('Installs', res.maxInstalls ? res.maxInstalls.toLocaleString() + '+' : 'Unknown', true)
          .addField('Released On', res.released || 'Unknown', true);
        return msg.channel.send({embeds: [em]});
      })
      .catch(() => {
        return msg.channel.send('I could not find any app with that name.');
      });
  }
}
module.exports = gPlay;
