const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev');

class Men extends Command {
  constructor (client) {
    super(client, {
      name: 'men',
      description: 'Sends a random image of men.',
      usage: 'men',
      category: 'NSFW',
      aliases: ['man', 'guy', 'guys'],
      nsfw: true
    });
  }

  async run (msg) {
    const post = await trev.nsfw.men();

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setColor('#0099CC')
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Men;
