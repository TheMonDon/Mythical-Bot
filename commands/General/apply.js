const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class apply extends Command {
  constructor(client) {
    super(client, {
      name: 'apply',
      description: 'Apply for staff!',
      usage: 'apply',
      category: 'General',
    });
  }

  async run(msg) {
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        {
          name: 'Crafters-Island Staff Applications',
          value: 'You can apply for staff here: https://forms.gle/hThZY7WyyHu7e3ZaA',
          inline: true,
        },
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = apply;
