const Command = require('../../base/Command.js');
const { getTickets } = require('../../util/Util.js');
const db = require('quick.db');
const { EmbedBuilder, ChannelType } = require('discord.js');
const { stripIndents } = require('common-tags');
const { DateTime } = require('luxon');

class NewTicket extends Command {
  constructor (client) {
    super(client, {
      name: 'new-ticket',
      description: 'Create a new ticket.',
      usage: 'New-ticket <reason>',
      category: 'Tickets',
      aliases: ['new', 'nt', 'newticket'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');
    const { catID, logID, roleID } = db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.guild.members.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing Manage Channels permission.');
    if (!msg.guild.members.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing Manage Roles permission');
    if (!msg.guild.members.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing Manage Messages permission');

    if (msg.channel.name.startsWith('ticket')) return msg.channel.send('You\'re already in a ticket, silly.');
    if (!args || args.length < 1) return msg.channel.send(`Please provide a reason. Usage: ${msg.settings.prefix}New-ticket <reason>`);

    const tix = getTickets(msg.author.id, msg);
    if (tix.length > 2) {
      return msg.channel.send(`Sorry ${msg.author}, you already have three or more tickets open. Please close one before making a new one.`);
    }

    const reason = args.join(' ');
    if (reason.length > 1024) return msg.channel.send('Your reason must be less than 1024 characters.');

    const perms = [
      {
        id: msg.member.id,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: msg.guild.members.me.id,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: roleID,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: msg.guild.id,
        deny: ['VIEW_CHANNEL']
      }
    ];

    const count = db.get(`servers.${msg.guild.id}.tickets.count`) || 0;
    db.set(`servers.${msg.guild.id}.tickets.count`, count + 1);

    let str = msg.member.displayName;
    str = str.replace(/[^a-zA-Z\d:]/g, '');
    if (str.length === 0) {
      str = msg.member.user.username.replace(/[^a-zA-Z\d:]/g, '');
      if (str.length === 0) {
        str = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
      }
    }

    str = str.toLowerCase();
    const tName = `ticket-${str}-${count}`;
    const tixChan = await msg.guild.channels.create(tName, { type: ChannelType.GuildText, parent: catID, permissionOverwrites: perms, topic: reason });

    db.set(`servers.${msg.guild.id}.tickets.${tName}.owner`, msg.author.id);

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addFields([
        { name: 'Reason', value: reason },
        { name: 'Channel', value: tixChan }
      ])
      .setFooter({ text: 'Self destructing in 2 minutes.' })
      .setColor('#E65DF4')
      .setTimestamp();
    const reply = await msg.channel.send({ embeds: [userEmbed] });
    setTimeout(() => reply.delete(), 60000);
    msg.delete();

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('New Ticket Created')
      .addFields([
        { name: 'Author', value: `${msg.author} (${msg.author.id})`, inLine: false },
        { name: 'Channel', value: `${tixChan} \n(${tName}: ${tixChan.id})`, inLine: false },
        { name: 'Reason', value: reason, inLine: false }
      ])
      .setColor('#E65DF4')
      .setTimestamp();
    const logChan = msg.guild.channels.cache.get(logID);
    await logChan.send({ embeds: [logEmbed] });

    const chanEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addFields([{ name: 'Reason', value: reason, inLine: false }])
      .setDescription('Please wait patiently and our support team will be with you shortly.')
      .setColor('#E65DF4')
      .setTimestamp();

    const role = msg.guild.roles.cache.get(roleID);
    if (!role.mentionable) {
      if (!tixChan.permissionsFor(this.client.user.id).has('MENTION_EVERYONE')) {
        role.setMentionable(true);
        tixChan.send({ content: role.toString(), embeds: [chanEmbed] });
      } else {
        tixChan.send({ content: role.toString(), embeds: [chanEmbed] });
      }
    } else {
      tixChan.send({ content: role.toString(), embeds: [chanEmbed] });
    }

    // Logging info
    const output = stripIndents`
    Ticket created at: ${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)}

    Author: ${msg.author.id} (${msg.author.tag})

    Topic: ${reason}\n
    `;

    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);
  }
}

module.exports = NewTicket;
