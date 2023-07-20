const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class RoleInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'role-info',
      description: 'Gives some useful role information',
      usage: 'role-info <Role Name | Role ID | @role>',
      requiredArgs: 1,
      category: 'Information',
      aliases: ['ri', 'roleinfo'],
      guildOnly: true,
    });
  }

  async run(msg, text) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Role-Info <Role Name | Role Id | @role>`;

    const infoRole = this.client.util.getRole(msg, text.join(' '));
    if (!infoRole) return msg.reply(usage);

    // Get the role's creation date and format it
    const then = moment(infoRole.createdAt);
    const time = then.from(moment());
    const ca = then.format('dddd, MMMM Do, YYYY, h:mm a');

    await msg.guild.members.fetch();

    const embed = new EmbedBuilder()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(infoRole.hexColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: infoRole.name, inline: true },
        { name: 'ID', value: infoRole.id.toString(), inline: true },
        { name: 'Mention', value: `\`${infoRole}\``, inline: true },
        { name: 'Color', value: infoRole.hexColor.toString().toUpperCase(), inline: true },
        { name: 'Members', value: infoRole.members.size.toLocaleString(), inline: true },
        { name: 'Position', value: `${infoRole.position}/${msg.guild.roles.cache.size}`, inline: true },
        { name: 'Mentionable', value: infoRole.mentionable.toString(), inline: true },
        { name: 'Managed', value: infoRole.managed.toString(), inline: true },
        { name: 'Created At', value: `${ca} (${time})`, inline: true },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RoleInfo;
