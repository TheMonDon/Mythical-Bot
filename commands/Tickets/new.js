const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class New extends Command {
  constructor (client) {
    super(client, {
      name: 'new',
      description: 'Create a new ticket.',
      usage: 'new <reason>',
      category: 'Tickets',
      aliases: ['new-ticket', 'nt', 'newt'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const server = msg.guild;

    const { catID, logID, roleID } = db.get(`servers.${server.id}.tickets`);
    if (!catID) return msg.channel.send('The ticket system has not been setup in this server.');

    if (msg.channel.name.startsWith('ticket')) return msg.channel.send('You\'re already in a ticket, silly.');
    if (!args || args.length < 1) return msg.channel.send('Please provide a reason. Usage: new <reason>');

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

    const count = db.get(`servers.${server.id}.tickets.count`) || 1;
    db.set(`servers.${server.id}.tickets.count`, count + 1);
    const tixChan = await msg.guild.channels.create(`ticket-${msg.member.displayName}-${count}`, { type: 'text', parent: catID, permissionOverwrites: perms});
    
    const reason = args.join(' ');
    if (reason.length > 1024) return msg.channel.send('Your reason must be less than 1024 characters.');

    const usertEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addField('Reason', reason, true)
      .addField('Channel', tixChan, true)
      .setFooter('Self destructing in 2 minutes.')
      .setColor('#E65DF4')
      .setTimestamp();
    const reply = await msg.channel.send(usertEmbed);
    msg.delete();

    const logEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle('New Ticket Created')
      .addField('Author', `${msg.author} (${msg.author.id})`, false)
      .addField('Channel', `${tixChan} (${tixChan.id})`, false)
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
    tixChan.send(role, chanEmbed);

    return reply.delete(120000);
  }
}

module.exports = New;
