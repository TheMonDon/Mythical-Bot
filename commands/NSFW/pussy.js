const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class pussy extends Command {
  constructor (client) {
    super(client, {
      name: 'pussy',
      description: 'Sends a random image of some pussy.',
      usage: 'pussy',
      category: 'NSFW',
      aliases: ['puss', 'vagina', 'puspus'],
      nsfw: true
    });
  }

  async run (msg) {
    const pussy = await trev.nsfw.pussy();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(pussy.title)
      .setURL(pussy.permalink)
      .setImage(pussy.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = pussy;
