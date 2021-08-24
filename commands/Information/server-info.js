const Command = require('../../base/Command.js');
const { toProperCase } = require('../../util/Util.js');
const DiscordJS = require('discord.js');
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
    const ca = then.format('MMM Do, YYYY');

    const roles = server.roles.cache.sort((a, b) => b.position - a.position);
    const fRoles = roles.filter(r => r.id !== server.id);
    let roles1 = [...fRoles.values()].join(', ');

    if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';

    if (roles1.length > 1020) {
      roles1 = roles1.substring(0, 1020).replace(/,[^,]+$/, '');
      roles1 = roles1 + ' ...';
    }

    const embed = new DiscordJS.MessageEmbed()
      .setTitle(`${server.name}'s Information`)
      .setColor('#EE82EE')
      .setThumbnail(msg.guild.iconURL())
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .addField('Name', server.name, true)
      .addField('ID', server.id.toString(), true)
      .addField('Owner', server.members.cache.get(server.ownerId).user.tag, true)
      .addField('Verification Level', toProperCase(server.verificationLevel), true)
      .addField('Channels', server.channels.cache.size.toLocaleString(), true)
      .addField('Created At', `${ca} \n (${time})`, true)
      .addField('AFK Channel', `${(server.afkChannel && server.afkChannel.name) || 'None Set'}`, true)
      .addField('Members', server.members.cache.size.toLocaleString(), true)
      .addField(`Roles (${server.roles.cache.size.toLocaleString()})`, server === msg.guild ? roles1 : 'Can\'t display roles outside the server', true);
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ServerInfo;
