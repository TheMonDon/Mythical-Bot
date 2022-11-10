const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class apply extends Command {
  constructor (client) {
    super(client, {
      name: 'apply',
      description: 'Apply for staff!',
      usage: 'apply',
      category: 'General'
    });
  }

  async run (msg) {
    // #0099CC
    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setAuthor({ name: this.client.user.username, iconURL: this.client.user.displayAvatarURL() })
      .setThumbnail(this.client.user.displayAvatarURL())
      .addFields([
        { name: 'Crafters-Island Staff Applications', value: 'You can apply for staff here: https://forms.gle/hThZY7WyyHu7e3ZaA', inline: true }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = apply;
