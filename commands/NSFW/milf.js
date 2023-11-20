const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Milf extends Command {
  constructor(client) {
    super(client, {
      name: 'milf',
      description: 'Sends a random image of a milf.',
      usage: 'milf',
      category: 'NSFW',
      nsfw: true,
    });
  }

  async run(msg) {
    const post = await trev.nsfw.milf();
    if (!post) return this.client.util.errorEmbed(msg, 'Failed to fetch a post from reddit. Please try again');

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(post.media)
      .setTimestamp();

    if (trev.isRedGifsLink(post.media)) {
      return msg.channel.send(post.media);
    } else {
      return msg.channel.send({ embeds: [em] });
    }
  }
}

module.exports = Milf;
