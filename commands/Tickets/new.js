const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');

class New extends Command {
  constructor (client) {
    super(client, {
      name: 'new',
      description: 'Create a new ticket.',
      usage: 'New <reason>',
      category: 'Tickets',
      aliases: ['new-ticket', 'nt', 'newt', 'create'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;

    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');
    const { catID, logID, roleID } = db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.guild.me.permissions.has('MANAGE_CHANNELS')) return msg.channel.send('The bot is missing manage channels perm.');
    if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot is missing manage roles perm');
    if (!msg.guild.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot is missing manage messages perm');

    if (msg.channel.name.startsWith('ticket')) return msg.channel.send('You\'re already in a ticket, silly.');
    if (!args || args.length < 1) return msg.channel.send(`Please provide a reason. Usage: ${p}New <reason>`);

    function getTickets (userID, msg) {
      const tickets = db.get(`servers.${msg.guild.id}.tickets`);
      const userTickets = [];
      if (tickets) {
        Object.values(tickets).forEach((val) => {
          if (val.owner === userID) {
            userTickets.push(val);
          }
        });
      }
      if (!userTickets) return;
      return userTickets;
    }

    const tix = getTickets(msg.author.id, msg);
    if (tix.length > 2) {
      return msg.channel.send(`Sorry ${msg.author}, you already have three or more tickets open, please close one before making a new one.`);
    }

    const reason = args.join(' ');
    if (reason.length > 1024) return msg.channel.send('Your reason must be less than 1024 characters.');

    const perms = [
      {
        id: msg.member.id,
        allow: ['VIEW_CHANNEL']
      },
      {
        id: msg.guild.me.id,
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

    const count = db.get(`servers.${msg.guild.id}.tickets.count`) || 1;
    db.set(`servers.${msg.guild.id}.tickets.count`, count + 1);

    let str = msg.member.displayName.toLowerCase();
    str = str.replace(/[^a-zA-Z\d:]/g, '');
    if (str.length === 0) {
      str = msg.member.user.username.replace(/[^a-zA-Z\d:]/g, '');
      if (str.length === 0) {
        str = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
      }
    }
    const tName = `ticket-${str}-${count}`;
    const tixChan = await msg.guild.channels.create(tName, { type: 'text', parent: catID, permissionOverwrites: perms, topic: reason });

    db.set(`servers.${msg.guild.id}.tickets.${tName}.owner`, msg.author.id);

    const userEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addField('Reason', reason, true)
      .addField('Channel', tixChan, true)
      .setFooter('Self destructing in 2 minutes.')
      .setColor('#E65DF4')
      .setTimestamp();
    const reply = await msg.channel.send(userEmbed);
    reply.delete({ timeout: 60000 });
    msg.delete();

    const logEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle('New Ticket Created')
      .addField('Author', `${msg.author} (${msg.author.id})`, false)
      .addField('Channel', `${tixChan} \n(${tName}: ${tixChan.id})`, false)
      .addField('Reason', reason, false)
      .setColor('#E65DF4')
      .setTimestamp();
    const logChan = msg.guild.channels.cache.get(logID);
    await logChan.send(logEmbed);

    const chanEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addField('Reason', reason, false)
      .setDescription('Please wait patiently and our support team will be with you shortly.')
      .setColor('#E65DF4')
      .setTimestamp();
    const role = msg.guild.roles.cache.get(roleID);
    if (!role.mentionable) {
      if (!tixChan.permissionsFor(this.client.user.id).has('MENTION_EVERYONE')) {
        role.setMentionable(true);
        tixChan.send(role, chanEmbed);
      } else {
        tixChan.send(role, chanEmbed);
      }
    } else {
      tixChan.send(role, chanEmbed);
    }

    // Logging info
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const timestamp = month + '/' + day + '/' + year + ' ' + hour + ':' + min;

    const output = stripIndents`
    Ticket created at: ${timestamp}

    Author: ${msg.author.id} (${msg.author.tag})

    Topic: ${reason}\n
    `;

    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);
  }
}

module.exports = New;
