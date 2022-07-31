const Command = require('../../base/Command.js');
const { getRole } = require('../../util/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class RoleInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'role-info',
      description: 'Gives some useful role information',
      usage: 'Role-Info <Role Name | Role ID | @role>',
      category: 'Information',
      aliases: ['ri', 'roleinfo'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Role-Info <Role Name | Role Id | @role>`;

    if (!text || text.length < 1) return msg.reply(usage);

    const infoRole = getRole(msg, text.join(' '));
    if (!infoRole) return msg.reply(usage);

    // time
    const then = moment(infoRole.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');
    await msg.guild.members.fetch();

    const embed = new DiscordJS.EmbedBuilder()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(infoRole.hexColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: infoRole.name },
        { name: 'ID', value: infoRole.id.toString() },
        { name: 'Mention', value: `\`${infoRole}\`` },
        { name: 'Color', value: infoRole.hexColor.toString().toUpperCase() },
        { name: 'Members', value: infoRole.members.size.toLocaleString() },
        { name: 'Position', value: `${infoRole.position}/${msg.guild.roles.cache.size}` },
        { name: 'Mentionable', value: infoRole.mentionable.toString() },
        { name: 'Managed', value: infoRole.managed.toString() },
        { name: 'Created At', value: `${ca} (${time})` }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RoleInfo;
