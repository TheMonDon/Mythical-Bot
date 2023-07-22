const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Reddit extends Command {
  constructor(client) {
    super(client, {
      name: 'reddit',
      description: 'Sends a random image from a subreddit of your choice.',
      usage: 'reddit <Subreddit>',
      requiredArgs: 1,
      category: 'Search',
    });
  }

  async run(msg, args) {
    const subreddit = args.join('');

    try {
      const post = await trev.getCustomSubreddit(subreddit);

      const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
      const text = post.text?.length > 4000 ? post.text.slice(0, 4000) + '\nRead more on reddit.' : post.text;
      const em = new EmbedBuilder()
        .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
        .setTitle(post.title)
        .setColor(msg.settings.embedColor)
        .setURL(post.permalink)
        .setImage(post.media)
        .setTimestamp();
      if (text) em.setDescription(text);

      if (post.over_18 && msg.channel.nsfw === false) {
        return msg.channel.send('The post from that subreddit is NSFW and could not be sent in this channel.');
      }

      if (trev.isRedGifsLink(post.media)) {
        return msg.channel.send(post.media);
      } else {
        return msg.channel.send({ embeds: [em] });
      }
    } catch (err) {
      console.log(err);
      return msg.channel.send(`An error ocurred: ${err}`);
    }
  }
}

module.exports = Reddit;
