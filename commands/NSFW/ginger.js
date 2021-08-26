const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Ginger extends Command {
  constructor (client) {
    super(client, {
      name: 'ginger',
      description: 'Sends a random image of some thongs.',
      usage: 'ginger',
      category: 'NSFW',
      nsfw: true,
      aliases: ['gingers', 'redhead', 'redheads']
    });
  }

  async run (msg) {
    const post = await trev.nsfw.ginger();

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Ginger;