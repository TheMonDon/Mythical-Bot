const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class ShowerThoughts extends Command {
  constructor(client) {
    super(client, {
      name: 'shower-thoughts',
      description: 'Get a random shower thought.',
      usage: 'shower-thoughts',
      category: 'Fun',
      aliases: ['showerthoughts', 'showerthought', 'shower-thought'],
    });
  }

  async run(msg) {
    try {
      const post = await trev.getCustomSubreddit('Showerthoughts');
      if (!post) return msg.channel.send("I couldn't think of a shower thought right now. Please try again.");

      const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
      const em = new EmbedBuilder()
        .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
        .setTitle(post.title)
        .setColor(msg.settings.embedColor)
        .setURL(post.permalink)
        .setTimestamp();

      if (post.text) {
        const text = post.text?.length > 4000 ? post.text.slice(0, 4000) + '\nRead more on reddit.' : post.text;
        em.setDescription(text);
      }

      if (post.over_18 && msg.channel.nsfw === false) {
        return msg.channel.send('The post from that subreddit is NSFW and could not be sent in this channel.');
      }

      if (trev.isRedGifsLink(post.media)) {
        return msg.channel.send(post.media);
      } else {
        return msg.channel.send({ embeds: [em] });
      }
    } catch (error) {
      this.client.logger.error(error);
      return msg.channel.send(`An error ocurred: ${error}`);
    }
  }
}

module.exports = ShowerThoughts;
