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

    const embed = new DiscordJS.MessageEmbed()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(infoRole.hexColor)
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .addField('Name', infoRole.name, true)
      .addField('ID', infoRole.id.toString(), true)
      .addField('Mention', `\`${infoRole}\``, true)
      .addField('Color', infoRole.hexColor.toString(), true)
      .addField('Members', infoRole.members.size.toLocaleString(), true)
      .addField('Position', `${infoRole.position}/${msg.guild.roles.cache.size}`, true)
      .addField('Hoisted', infoRole.hoist.toString(), true)
      .addField('Mentionable', infoRole.mentionable.toString(), true)
      .addField('Managed', infoRole.managed.toString(), true)
      .addField('Created At', `${ca} (${time})`, true);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = RoleInfo;
