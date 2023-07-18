const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Reddit extends Command {
  constructor(client) {
    super(client, {
      name: 'reddit',
      description: 'Sends a random image from a subreddit of your choice.',
      usage: 'Reddit <Subreddit>',
      category: 'Search',
    });
  }

  async run(msg, args) {
    if (!args || args.length < 1) return msg.reply(`Incorrect Usage: ${msg.settings.prefix}reddit <subreddit>`);
    const subreddit = args.join('');

    try {
      const post = await trev.getCustomSubreddit(subreddit);

      const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
      const em = new EmbedBuilder()
        .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
        .setTitle(post.title)
        .setURL(post.permalink)
        .setImage(post.media)
        .setTimestamp();

      if (post.over_18 && msg.channel.nsfw === false) {
        return msg.channel.send('The post from that subreddit is NSFW and could not be sent in this channel.');
      }

      return msg.channel.send({ embeds: [em] });
    } catch (err) {
      return msg.channel.send('Could not get an image from that subreddit.');
    }
  }
}

module.exports = Reddit;
