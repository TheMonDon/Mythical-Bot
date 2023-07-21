const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Men extends Command {
  constructor(client) {
    super(client, {
      name: 'men',
      description: 'Sends a random image of men.',
      usage: 'men',
      category: 'NSFW',
      aliases: ['man', 'guy', 'guys'],
      nsfw: true,
    });
  }

  async run(msg) {
    const post = await trev.nsfw.men();
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

module.exports = Men;
