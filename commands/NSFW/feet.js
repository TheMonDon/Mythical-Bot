const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev');

class Feet extends Command {
  constructor (client) {
    super(client, {
      name: 'feet',
      description: 'Sends a random image of some feet.',
      usage: 'feet',
      category: 'NSFW',
      aliases: ['foot', 'toes', 'feetpics'],
      nsfw: true
    });
  }

  async run (msg) {
    const post = await trev.nsfw.feet();

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

module.exports = Feet;
