const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Pussy extends Command {
  constructor(client) {
    super(client, {
      name: 'pussy',
      description: 'Sends a random image of some pussy.',
      usage: 'pussy',
      category: 'NSFW',
      aliases: ['puss', 'vagina', 'puspus'],
      nsfw: true,
    });
  }

  async run(msg) {
    const post = await trev.nsfw.pussy();

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

module.exports = Pussy;
