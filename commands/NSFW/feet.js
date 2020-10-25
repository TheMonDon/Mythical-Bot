const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class feet extends Command {
  constructor (client) {
    super(client, {
      name: 'feet',
      description: 'Sends a random image of some feet.',
      usage: 'feet',
      category: 'NSFW',
      aliases: ['foot', 'toes', 'feetpics'],
      nsfw: true
    });
  }

  async run (msg) {
    const feet = await trev.nsfw.feet();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(feet.title)
      .setURL(feet.permalink)
      .setImage(feet.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = feet;