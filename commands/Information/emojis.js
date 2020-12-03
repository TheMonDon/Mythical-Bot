const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');

class Emojis extends Command {
  constructor(client) {
    super(client, {
      name: 'emojis',
      description: 'Shows all the custom emojis in the server.',
      usage: 'emojis',
      category: 'Information'
    });
  }

  async run(msg) {
    const result = [];

    msg.guild.emojis.cache.forEach((e) => {
      result.push(e);
    })

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Custom Emojis')
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setDescription(`\`Here is the server's emoji list:\` \n\n${result.join(',')}`)
      .setTimestamp();
    msg.channel.send(embed);
  }
}

module.exports = Emojis;
