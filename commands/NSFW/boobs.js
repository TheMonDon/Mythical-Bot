const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Boobs extends Command {
  constructor (client) {
    super(client, {
      name: 'boobs',
      description: 'Sends a random image of some boobs.',
      usage: 'boobs',
      category: 'NSFW',
      aliases: ['boobies', 'tits', 'titties'],
      nsfw: true
    });
  }

  async run (msg) {
    const post = await trev.nsfw.boobs();

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const em = new DiscordJS.EmbedBuilder()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Boobs;
