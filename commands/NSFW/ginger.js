const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Ginger extends Command {
  constructor(client) {
    super(client, {
      name: 'ginger',
      description: 'Sends a random image of gingers.',
      usage: 'ginger',
      category: 'NSFW',
      nsfw: true,
      aliases: ['gingers', 'redhead', 'redheads'],
    });
  }

  async run(msg) {
    const post = await trev.nsfw.ginger();
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

module.exports = Ginger;
