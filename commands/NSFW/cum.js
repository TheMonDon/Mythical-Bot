const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class cum extends Command {
  constructor (client) {
    super(client, {
      name: 'cum',
      description: 'Sends a random image of some cum.',
      usage: 'cum',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const cum = await trev.nsfw.cum();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(cum.title)
      .setURL(cum.permalink)
      .setImage(cum.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({embeds: [em]});
  }
}

module.exports = cum;
