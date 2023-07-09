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
    });
  }

  async run(msg, args) {
    let server;
    const usage = `${msg.settings.prefix}server-info [server ID] (The bot must be in the server you want to get information for)`;

    // Check if the user provided a server ID
    if (!args || args.length < 1) {
      // If the user didn't provide a server ID, check if the message was sent in a guild
      if (!msg.guild) return msg.channel.send(usage);
      // If the message was sent in a guild, set the server to the guild
      server = msg.guild;
    } else {
      // If the user provided a server ID, check if the bot is in the server
      server = this.client.guilds.cache.get(args.join(' '));
    }

    // If the bot isn't in the server, return an error
    if (!server) return msg.channel.send('I could not find a server with that ID.');

    if (!server.available) return msg.channel.send('That server is currently unavailable');

    await server.members.fetch();

    // Get the server's creation date and format it
    const then = moment(server.createdAt);
    const time = then.from(moment());
    const ca = then.format('dddd, MMMM Do, YYYY, h:mm a');

    // Get the server's roles and format them
    const roles = server.roles.cache.sort((a, b) => b.position - a.position);
    const fRoles = roles.filter((r) => r.id !== server.id);
    let roles1 = [...fRoles.values()].join(', ');

    if (roles1 === undefined || roles1.length === 0) roles1 = 'No Roles';

    // If the roles are too long, trim them
    if (roles1.length > 1020) {
      roles1 = roles1.substring(0, 1020).replace(/,[^,]+$/, '');
      roles1 = roles1 + ' ...';
    }

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
        {
          name: `Roles (${server.roles.cache.size.toLocaleString()})`,
          value: server === msg.guild ? roles1 : "Can't display roles outside the server",
          inline: false,
        },
      ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ServerInfo;
