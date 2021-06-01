const Command = require('../../base/Command.js');
const { getRole } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class roleInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'role-info',
      description: 'Gives some useful role information',
      usage: 'role-info <Role Name | Role ID | @role>',
      category: 'Information',
      aliases: ['ri', 'roleinfo'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    const server = msg.guild;
    const p = msg.settings.prefix;

    if (!text || text.length < 1) return msg.channel.send(`:x: Incorrect Usage: ${p}roleinfo <Role Name | Role ID | @role>`);

    const infoRole = getRole(msg, text.join(' '));

    if (!infoRole) return msg.channel.send(`:x: Incorrect Usage: ${p}roleinfo <Role Name | Role ID | @role>`);

    // time
    const then = moment(infoRole.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');

    const embed = new DiscordJS.MessageEmbed()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(infoRole.hexColor)
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .addField('Name', infoRole.name, true)
      .addField('ID', infoRole.id, true)
      .addField('Mention', `\`${infoRole}\``, true)
      .addField('Color', infoRole.hexColor, true)
      .addField('Members', infoRole.members.size.toLocaleString(), true)
      .addField('Position', `${infoRole.position}/${server.roles.cache.size}`, true)
      .addField('Hoisted', infoRole.hoist, true)
      .addField('Mentionable', infoRole.mentionable, true)
      .addField('Managed', infoRole.managed, true)
      .addField('Created At', `${ca} (${time})`, true);
    return msg.channel.send(embed);
  }
}

module.exports = roleInfo;
