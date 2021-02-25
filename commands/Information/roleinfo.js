const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class Stats extends Command {
  constructor(client) {
    super(client, {
      name: 'roleinfo',
      description: 'Gives some useful role information',
      usage: 'rolelinfo',
      category: 'Information',
      aliases: ['ri'],
      guildOnly: true
    });
  }

  async run(msg, text) {
    let infoRole;
    const server = msg.guild;
    const p = msg.settings.prefix;

    if (!text || text.length < 1) {
      return msg.channel.send(`:x: Incorrect Usage: ${p}roleinfo <Role Name | role ID | @role>`);
    } else {
      infoRole = msg.mentions.roles.first() || server.roles.cache.find(r => r.name === `${text.join(' ')}`) || server.roles.cache.find(r => r.id === `${text.join(' ')}`) || server.roles.cache.find(r => r.name.toLowerCase() === `${text.join(' ').toLowerCase()}`) || server.roles.cache.find(r => r.id === `${text.join(' ').replace('<@&', '').replace('>', '')}`);
    }

    if (!infoRole) {
      return msg.channel.send(`:x: Incorrect Usage: ${p}roleinfo <Role Name | role ID | @role>`);
    }
    //time
    const then = moment(infoRole.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');

    const embed = new DiscordJS.MessageEmbed()
      .setTitle(`${infoRole.name}'s Information`)
      .setColor(hex)
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
    msg.channel.send(embed);
  }
}

module.exports = Stats;
