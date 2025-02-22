const Command = require('../../base/Command.js');
const { EmbedBuilder, ChannelType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class NewTicket extends Command {
  constructor(client) {
    super(client, {
      name: 'new-ticket',
      description: 'Create a new ticket.',
      usage: 'New-Ticket <Reason>',
      category: 'Tickets',
      aliases: ['new', 'newticket'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!(await db.get(`servers.${msg.guild.id}.tickets`))) {
      return msg.channel.send('The ticket system has not been setup in this server.');
    }
    const { catID, logID, roleID } = await db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.guild.channels.cache.get(catID)) {
      return msg.channel.send('Please re-run `setup`, the ticket category is missing.');
    }

    if (!msg.guild.members.me.permissions.has('ManageChannels')) {
      return msg.channel.send('Please let a server administrator know the bot is missing Manage Channels permission.');
    }
    if (!msg.guild.members.me.permissions.has('ManageRoles')) {
      return msg.channel.send('Please let a server administrator know the bot is missing Manage Roles permission');
    }
    if (!msg.guild.members.me.permissions.has('ManageMessages')) {
      return msg.channel.send('Please let a server administrator know the bot is missing Manage Messages permission');
    }

    if (msg.channel.name.startsWith('ticket')) return msg.channel.send("You're already in a ticket, silly.");
    if (!args || args.length < 1) {
      return msg.channel.send(`Please provide a reason. Usage: ${msg.settings.prefix}new-ticket <reason>`);
    }

    const userTickets = await this.client.util.getTickets(msg.author.id, msg);
    const ticketLimit = (await db.get(`servers.${msg.guild.id}.tickets.limit`)) || 3;
    if (userTickets.length >= ticketLimit) {
      return msg.reply(
        `Sorry ${msg.member.displayName}, you already have ${userTickets.length} of ${ticketLimit} tickets open. Please close one before making a new one.`,
      );
    }

    const reason = args.join(' ');
    if (reason.length > 1024) return msg.channel.send('Your reason must be less than 1024 characters.');

    const perms = [
      {
        id: msg.author.id,
        allow: ['ViewChannel'],
      },
      {
        id: msg.guild.members.me.id,
        allow: ['ViewChannel'],
      },
      {
        id: roleID,
        allow: ['ViewChannel'],
      },
      {
        id: msg.guild.id,
        deny: ['ViewChannel'],
      },
    ];

    let channelName = msg.member.displayName;
    channelName = channelName.replace(/[^a-zA-Z\d:]/g, '');
    if (channelName.length === 0) {
      channelName = msg.member.user.username.replace(/[^a-zA-Z\d:]/g, '');
      if (channelName.length === 0) {
        channelName = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
      }
    }

    const tName = `ticket-${channelName}`;
    const tixChan = await msg.guild.channels.create({
      name: tName,
      type: ChannelType.GuildText,
      parent: catID,
      permissionOverwrites: perms,
      topic: reason,
    });

    await db.set(`servers.${msg.guild.id}.tickets.${tixChan.id}.owner`, msg.author.id);

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addFields([
        { name: 'Reason', value: reason },
        { name: 'Channel', value: tixChan.toString() },
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
        { name: 'Author', value: `${msg.author} (${msg.author.id})`, inline: false },
        { name: 'Channel', value: `${tixChan} \n(${tName}: ${tixChan.id})`, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setColor('#E65DF4')
      .setTimestamp();
    const logChan = msg.guild.channels.cache.get(logID);
    await logChan.send({ embeds: [logEmbed] });

    const chanEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`${msg.member.displayName}'s Ticket`)
      .addFields([{ name: 'Reason', value: reason, inline: false }])
      .setDescription('Please wait patiently and our support team will be with you shortly.')
      .setColor('#E65DF4')
      .setTimestamp();

    const role = msg.guild.roles.cache.get(roleID);
    if (!role.mentionable) {
      if (!tixChan.permissionsFor(this.client.user.id).has('MentionEveryone')) {
        role.setMentionable(true);
        tixChan.send({ content: role.toString(), embeds: [chanEmbed] });
        return role.setMentionable(false);
      }
    }

    return tixChan.send({ content: role.toString(), embeds: [chanEmbed] });
  }
}

module.exports = NewTicket;
