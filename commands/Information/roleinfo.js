const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class Stats extends Command {
  constructor (client) {
    super(client, {
      name: 'roleinfo',
      description: 'Gives some useful role information.',
      usage: 'rolelinfo',
      category: 'Information',
      aliases: ['ri'],
      guildOnly: true
    });
  }

  async run (msg, text) { // eslint-disable-line no-unused-vars
    let infoRole;
    const server = msg.guild;

    if (!text || text.length < 1) {
      msg.channel.send(`:x: Incorrect Usage: ${server.tag}roleinfo <Role Name | role ID | @role>`);
      if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();
    } else {
      infoRole = msg.mentions.roles.first() || server.roles.cache.find(r => r.name === `${text.join(' ')}`) || server.roles.cache.find(r => r.id === `${text.join(' ')}`) || server.roles.cache.find(r => r.name.toLowerCase() === `${text.join(' ').toLowerCase()}`) || server.roles.cache.find(r => r.id === `${text.join(' ').replace('<@&', '').replace('>', '')}`);

      if (!infoRole) {
        msg.channel.send(`:x: Incorrect Usage: ${server.tag}roleinfo <Role Name | role ID | @role>`);
        if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();
      } else {
        //time
        const then = moment(infoRole.createdAt);
        const time = then.from(moment());
        const ca = then.format('MMM Do, YYYY');
        //color
        const decimal = infoRole.color;
        const hex = '#' + decimal.toString(16)
          .toUpperCase();
        const embed = new DiscordJS.MessageEmbed()
          .setTitle(`${infoRole.name}'s Information`)
          .setColor(infoRole.color)
          .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
          .addField('Name', infoRole.name, true)
          .addField('ID', infoRole.id, true)
          .addField('Mention', `\`${infoRole}\``, true)
          .addField('Color', hex, true)
          .addField('Members', infoRole.members.size.toLocaleString(), true)
          .addField('Position', `${infoRole.position}/${server.roles.cache.size}`, true)
          .addField('Hoisted', infoRole.hoist, true)
          .addField('Mentionable', infoRole.mentionable, true)
          .addField('Managed', infoRole.managed, true)
          .addField('Created At', `${ca} (${time})`, true);
        msg.channel.send(embed);
        if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();
      }
    }
  }
}

module.exports = Stats;
