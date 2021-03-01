const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class ass extends Command {
  constructor (client) {
    super(client, {
      name: 'ass',
      description: 'Sends a random image of some ass.',
      usage: 'ass',
      category: 'NSFW',
      aliases: ['butt', 'booty', 'asshole'],
      nsfw: true
    });
  }

  async run (msg) {
    const ass = await trev.nsfw.ass();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(ass.title)
      .setURL(ass.permalink)
      .setImage(ass.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = ass;
