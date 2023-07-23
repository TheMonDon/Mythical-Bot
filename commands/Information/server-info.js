const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class ServerInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'server-info',
      description: 'Gives some useful server information',
      usage: 'server-info [server ID]',
      category: 'Information',
      aliases: ['si', 'serverinfo'],
      examples: ['server-info', 'server-info 579742127676981269'],
    });
  }

  async run(msg, args) {
    let server;

    if (!args || args.length < 1) {
      if (!msg.guild) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Server');
      server = msg.guild;
    } else {
      server = this.client.guilds.cache.get(args.join(' '));
    }

    if (!server)
      return this.client.util.errorEmbed(
        msg,
        'The bot is not in that server and cannot provide information on it.',
        'Invalid Server',
      );
    if (!server.available) return this.client.util.errorEmbed(msg, 'That server is currently unavailable');
    await server.members.fetch();

    // Get the server's creation date and format it
    const then = moment(server.createdAt);
    const time = then.from(moment());
    const ca = then.format('dddd, MMMM Do, YYYY, h:mm a');

    // Get the server's roles and format them
    let displayedRoles;
    if (server === msg.guild) {
      let roles = server.roles.cache.sort((a, b) => b.position - a.position).filter((r) => r.id !== server.id);
      roles = [...roles.values()].join(', ');

      if (roles === undefined || roles.length === 0) roles = 'No Roles';

      // If the roles are too long, trim them
      if (roles.length > 1024) {
        roles = roles.substring(0, 1019).replace(/,[^,]+$/, '') + ', ...';
      }
      displayedRoles = roles;
    } else {
      let roles = server.roles.cache.sort((a, b) => b.position - a.position).filter((r) => r.id !== server.id);
      roles = [...roles.values()].map((r) => r.name).join(', ');

      if (roles.length > 1024) {
        roles = roles.substring(0, 1019).replace(/,[^,]+$/, '') + ', ...';
      }
      displayedRoles = roles;
    }

    const displayRolesName =
      server.roles.cache.size - 1 > displayedRoles.split(',').length
        ? `Roles (${server.roles.cache.size}/${displayedRoles.split(',').length - 1})`
        : `Roles (${server.roles.cache.size})`;

    const verificationLevel = ['None', 'Low', 'Medium', 'High', 'Very High'];

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const owner = server.members.cache.get(server.ownerId).user;
    const ownerName = owner.discriminator === '0' ? owner.username : owner.tag;
    const embed = new EmbedBuilder()
      .setTitle(`${server.name}'s Information`)
      .setColor(msg.settings.embedColor)
      .setThumbnail(msg.guild.iconURL())
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setFields([
        { name: 'Name', value: server.name, inline: true },
        { name: 'ID', value: server.id.toString(), inline: true },
        { name: 'Owner', value: ownerName, inline: true },
        { name: 'Verification Level', value: verificationLevel[server.verificationLevel], inline: true },
        { name: 'Channels', value: server.channels.cache.size.toLocaleString(), inline: true },
        { name: 'Created At', value: `${ca} \n (${time})`, inline: true },
        { name: 'AFK Channel', value: server.afkChannel?.name || 'No AFK Channel', inline: true },
        { name: 'Members', value: server.members.cache.size.toLocaleString(), inline: true },
        { name: displayRolesName, value: displayedRoles, inline: false },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ServerInfo;
