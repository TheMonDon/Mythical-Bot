const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class Reddit extends Command {
  constructor (client) {
    super(client, {
      name: 'reddit',
      description: 'Sends a random image from a subreddit of your choice.',
      usage: 'reddit <subreddit>',
      category: 'Search'
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}reddit <subreddit>`;
    if (!args || args.length < 1) return msg.reply(usage);
    const subreddit = args.join('');

    const post = await trev.getCustomSubreddit(subreddit);

    let image = post.media;
    if (trev.isImgurUpload(post.media)) image = trev.getRawImgur(post.media);
    if (trev.isGfyLink(post.media)) image = trev.gfyIframe(post.media);

    const em = new DiscordJS.MessageEmbed()
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(image)
      .setTimestamp();

    if (post.over_18 && msg.channel.nsfw === true) {
      return msg.channel.send({ embeds: [em] });
    } else if (post.over_18 && msg.channel.nsfw === false) {
      return msg.channel.send('The post from that subreddit is NSFW and could not be sent in this channel.');
    }

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Reddit;
