const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Dildo extends Command {
  constructor(client) {
    super(client, {
      name: 'dildo',
      description: 'Sends a random image of some dildos.',
      usage: 'dildo',
      category: 'NSFW',
      aliases: ['silicone', 'vibrator', 'fake'],
      nsfw: true,
    });
  }

  async run(msg) {
    const post = await trev.nsfw.dildo();
    if (!post) return this.client.util.embedError(msg, 'Failed to fetch a post from reddit. Please try again');

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const em = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(post.media)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Dildo;
