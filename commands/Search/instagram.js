const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const userInstagram = require('user-instagram');

class Instagram extends Command {
  constructor (client) {
    super(client, {
      name: 'instagram',
      description: 'Get user info from instagram',
      usage: 'instagram',
      category: 'Search',
      aliases: ['insta']
    });
  }

  async run (msg, text) {
    const query = text.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}instagram <instagram user>`);

    userInstagram(query)
      .then(res => {
        const em = new DiscordJS.EmbedBuilder()
          .setTitle(res.fullName)
          .setURL(res.link)
          .setThumbnail(res.profilePicHD)
          .addField('Biography', res.biography || 'N/A', true)
          .addField('Subscribers', res.subscribersCount || 'N/A', true)
          .addField('Subscriptions', res.subscriptions || 'N/A', true)
          .addField('Posts Count', res.postsCount || 'N/A', true)
          .addField('Is Private?', res.isPrivate || 'N/A', true)
          .addField('Is Verified?', res.isVerified || 'N/A', true);
        return msg.channel.send({ embeds: [em] });
      })
      .catch((err) => {
        return msg.channel.send(err.toString());
      });
  }
}
module.exports = Instagram;
