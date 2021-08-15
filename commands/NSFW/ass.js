const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Ass extends Command {
  constructor (client) {
    super(client, {
      name: 'ass',
      description: 'Sends a random image of some ass.',
      usage: 'ass',
      category: 'NSFW',
      aliases: ['butt', 'booty', 'asshole'],
      nsfw: true
    });
  }

  async run (msg) {
    const post = await trev.nsfw.ass();

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

module.exports = Ass;
