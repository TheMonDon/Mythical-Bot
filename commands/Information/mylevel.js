const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class MyLevel extends Command {
  constructor(client) {
    super(client, {
      name: 'mylevel',
      description: 'Displays your permission level',
      usage: 'mylevel',
      category: 'Information',
      aliases: ['level'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    const friendly = this.client.permLevels.find((l) => l.level === level).name;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .addFields([{ name: 'Permission Level', value: `${level} - ${friendly}` }]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = MyLevel;
