const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const userInstagram = require('user-instagram');

class insta extends Command {
  constructor (client) {
    super(client, {
      name: 'instagram',
      description: 'Get user info from instagram',
      usage: 'instagram',
      category: 'Information',
      aliases: ['insta']
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;
    const query = text.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}instagram <instagram user>`);

    userInstagram(query)
      .then(res => {
        const em = new DiscordJS.MessageEmbed()
          .setTitle(res.fullName)
          .setURL(res.link)
          .setThumbnail(res.profilePicHD)
          .addField('Biography', res.biography, true)
          .addField('Subscribers', res.subbscribersCount, true)
          .addField('Subscriptions', res.subscriptions, true)
          .addField('Posts Count', res.postsCount, true)
          .addField('Is Private?', res.isPrivate, true)
          .addField('Is Verified?', res.isVerified, true);
        return msg.channel.send(em);
      })
      .catch((err) => {
        return msg.channel.send(err.toString());
      });
  }
}
module.exports = insta;
