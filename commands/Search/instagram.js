const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
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
        const em = new EmbedBuilder()
          .setTitle(res.fullName)
          .setURL(res.link)
          .setThumbnail(res.profilePicHD)
          .addFields([
            { name: 'Biography', value: res.biography || 'N/A' },
            { name: 'Subscribers', value: res.subscribersCount || 'N/A' },
            { name: 'Subscriptions', value: res.subscriptions || 'N/A' },
            { name: 'Posts Count', value: res.postsCount || 'N/A' },
            { name: 'Is Private?', value: res.isPrivate || 'N/A' },
            { name: 'Is Verified?', value: res.isVerified || 'N/A' }
          ]);
        return msg.channel.send({ embeds: [em] });
      })
      .catch((err) => {
        return msg.channel.send(err.toString());
      });
  }
}
module.exports = Instagram;
