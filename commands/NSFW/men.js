const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class men extends Command {
  constructor (client) {
    super(client, {
      name: 'men',
      description: 'Sends a random image of some men.',
      usage: 'men',
      category: 'NSFW',
      aliases: ['man', 'guy', 'boy', 'guys'],
      nsfw: true
    });
  }

  async run (msg) {
    const men = await trev.nsfw.men();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(men.title)
      .setURL(men.permalink)
      .setImage(men.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = men;
