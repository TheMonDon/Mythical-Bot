const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Reddit extends Command {
  constructor (client) {
    super(client, {
      name: 'reddit',
      description: 'Sends a random image from a subreddit of your choice.',
      usage: 'reddit <subreddit>',
      category: 'Fun'
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}reddit <subreddit>`;
    if (!args || args.length < 1) return msg.channel.send(usage);
    const subreddit = args.join('');

    const post = await trev.getCustomSubreddit(subreddit);

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const em = new DiscordJS.MessageEmbed()
      .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    if (post.is_over18 && msg.channel.nsfw === true) {
      return msg.channel.send({ embeds: [em] });
    } else if (post.is_over18 && msg.channel.nsfw === false) {
      return msg.channel.send('The post from that subreddit is NSFW and could not be sent in this channel.');
    }

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Reddit;
