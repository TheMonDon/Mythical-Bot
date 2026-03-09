const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class RoleInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'role-info',
      description: 'Gives some useful role information',
      usage: 'role-info <Role Name | Role ID | @role>',
      category: 'Information',
      aliases: ['ri', 'roleinfo'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const infoRole = this.client.util.getRole(msg, args.join(' '));
    if (!infoRole) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    const hexColor = infoRole.hexColor.toString().toUpperCase();
    const color = hexColor === '#000000' ? 'None' : hexColor;
    const unix = Math.floor(infoRole.createdAt.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(infoRole.hexColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: infoRole.name, inline: true },
        { name: 'ID', value: infoRole.id.toString(), inline: true },
        { name: 'Mention', value: `\`${infoRole}\``, inline: true },
        { name: 'Color', value: color, inline: true },
        { name: 'Position', value: `${infoRole.position}/${msg.guild.roles.cache.size}`, inline: true },
        { name: 'Mentionable', value: infoRole.mentionable.toString(), inline: true },
        { name: 'Managed', value: infoRole.managed.toString(), inline: true },
        {
          name: 'Created At',
          value: `<t:${unix}:F> \n(<t:${unix}:R>)`,
          inline: true,
        },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RoleInfo;
