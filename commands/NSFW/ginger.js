const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev');

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

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const em = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Ginger;
