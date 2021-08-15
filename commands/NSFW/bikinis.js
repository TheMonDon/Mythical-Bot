const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Bikinis extends Command {
  constructor (client) {
    super(client, {
      name: 'bikinis',
      description: 'Sends a random image of some bikinis.',
      usage: 'bikinis',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const post = await trev.nsfw.bikinis();

    let image = post.media;
    if (post.isImgurUpload(post.media)) image = post.getRawImgur(post.media);
    if (post.isGfyLink(post.media)) image = post.gfyIframe(post.media);

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Bikinis;
