const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const gplay = require('google-play-scraper');

class gPlay extends Command {
  constructor (client) {
    super(client, {
      name: 'google-play',
      description: 'Get some information about any google play application.',
      usage: 'google-play <app>',
      category: 'Information',
      aliases: ['gplay', 'g-play', 'googleplay']
    });
  }

  async run (msg, text) {
    const term = text.join(' ');

    gplay.search({
      term: term,
      num: 1,
      fullDetail: true
    })
      .then(result => {
        const res = result?.[0];
        if (!res) return msg.channel.send('I could not find any app with that name.');

        console.log(res);
        const em = new DiscordJS.MessageEmbed()
          .setTitle(res.title)
          .setDescription(res.summary)
          .setURL(res.url)
          .setColor('#0099CC')
          .setThumbnail(res.icon)
          .addField('Developer', res.developer, true)
          .addField('Price', res.priceText, true)
          .addField('Rating', res.scoreText, true)
          .addField('Genre', res.genre, true)
          .addField('Installs', res.maxInstalls.toLocaleString() + '+', true)
          .addField('Released On', res.released, true);
        return msg.channel.send(em);
      })
      .catch(() => {
        return msg.channel.send('I could not find any app with that name.');
      });
  }
}
module.exports = gPlay;
