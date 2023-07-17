const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const trev = require('trev-reborn');

class Boobs extends Command {
  constructor(client) {
    super(client, {
      name: 'boobs',
      description: 'Sends a random image of some boobs.',
      usage: 'boobs',
      category: 'NSFW',
      aliases: ['boobies', 'tits', 'titties'],
      nsfw: true,
    });
  }

  async run(msg) {
    const post = await trev.nsfw.boobs();

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const em = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setTitle(post.title)
      .setURL(post.permalink)
      .setImage(post.media)
      .setTimestamp();

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Boobs;
