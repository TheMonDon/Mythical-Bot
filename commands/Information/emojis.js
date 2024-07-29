const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Emojis extends Command {
  constructor(client) {
    super(client, {
      name: 'emojis',
      description: 'Shows all the custom emojis in the server',
      usage: 'emojis',
      category: 'Information',
      guildOnly: true,
    });
  }

  async run(msg) {
    const result = [];

    // Fetches all the emojis in the server and adds them to the result array
    await msg.guild.emojis.fetch();
    msg.guild.emojis.cache.forEach((e) => {
      result.push(e);
    });

    if (result.length === 0) return msg.channel.send('There are no custom emojis in this server. :(');

    const embed = new EmbedBuilder()
      .setTitle('Custom Emojis')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`\`Here is the server's emoji list:\` \n\n${result.join(' ')}`)
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Emojis;
