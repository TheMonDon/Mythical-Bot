const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class ServerInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'server-info',
      description: 'Gives some useful server information',
      usage: 'server-info',
      category: 'Information',
      aliases: ['si', 'serverinfo', 'guildinfo']
    });
  }

  async run (msg, args) {
    let server;

    if (!args || args.length < 1) {
      if (!msg.guild) return msg.channel.send('Please provide a server to get information for.');
      server = msg.guild;
    } else {
      server = this.client.guilds.cache.get(args.join(' '));
    }
    if (!server) return msg.channel.send('I could not find a server with that ID.');

    if (!server.available) return msg.channel.send('That server is currently unavailable');

    await server.members.fetch();
    const then = moment(server.createdAt);
    const time = then.from(moment());
    const ca = then.format('dddd, MMMM Do, YYYY, h:mm a');

    const roles = server.roles.cache.sort((a, b) => b.position - a.position);
    const fRoles = roles.filter(r => r.id !== server.id);
    let roles1 = [...fRoles.values()].join(', ');

    if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';

    if (roles1.length > 1020) {
      roles1 = roles1.substring(0, 1020).replace(/,[^,]+$/, '');
      roles1 = roles1 + ' ...';
    }

    const verificationLevel = ['None', 'Low', 'Medium', 'High', 'Very High'];
    const embed = new EmbedBuilder()
      .setTitle(`${server.name}'s Information`)
      .setColor('#EE82EE')
      .setThumbnail(msg.guild.iconURL())
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setFields([
        { name: 'Name', value: server.name, inline: true },
        { name: 'ID', value: server.id.toString(), inline: true },
        { name: 'Owner', value: server.members.cache.get(server.ownerId).user.tag, inline: true },
        { name: 'Verification Level', value: verificationLevel[server.verificationLevel], inline: true },
        { name: 'Channels', value: server.channels.cache.size.toLocaleString(), inline: true },
        { name: 'Created At', value: `${ca} \n (${time})`, inline: true },
        { name: 'AFK Channel', value: server.afkChannel?.name || 'No AFK Channel', inline: true },
        { name: 'Members', value: server.members.cache.size.toLocaleString(), inline: true },
        { name: `Roles (${server.roles.cache.size.toLocaleString()})`, value: server === msg.guild ? roles1 : 'Can\'t display roles outside the server', inline: false }
      ]);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ServerInfo;
