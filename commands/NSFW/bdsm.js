const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class bdsm extends Command {
  constructor (client) {
    super(client, {
      name: 'bdsm',
      description: 'Sends a random image of some bdsm.',
      usage: 'bdsm',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const bdsm = await trev.nsfw.bdsm();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(bdsm.title)
      .setURL(bdsm.permalink)
      .setImage(bdsm.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = bdsm;