const discordTranscripts = require('discord-html-transcripts');
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class forceClose extends Command {
  constructor(client) {
    super(client, {
      name: 'force-close',
      description: 'Close your or another ticket',
      usage: 'force-close [Ticket Channel ID] [Reason]',
      category: 'Tickets',
      aliases: ['forceclose'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!(await db.get(`servers.${msg.guild.id}.tickets`)))
      return msg.channel.send('The ticket system has not been setup in this server.');

    let tID;
    let reason;
    if (msg.channel.name.startsWith('ticket')) {
      if (!args[0]) {
        tID = msg.channel.id;
        reason = 'No reason specified';
      } else if (await db.get(`servers.${msg.guild.id}.tickets.${args[0]}`)) {
        tID = args[0];
        args.shift();
        reason = args?.join(' ') || 'No reason specified';
      } else {
        tID = msg.channel.id;
        reason = args?.join(' ') || 'No reason specified';
      }
    } else {
      if (!args[0]) {
        return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}force-close [Ticket Channel ID] [Reason]`);
      }
      tID = args[0];
      args.shift();
      reason = args?.join(' ') || 'No reason specified';
    }

    const { logID, roleID } = await db.get(`servers.${msg.guild.id}.tickets`);

    const owner = await db.get(`servers.${msg.guild.id}.tickets.${tID}.owner`);
    msg.guild.members.fetch(owner);
    const role = msg.guild.roles.cache.get(roleID);

    if (!msg.channel.name.startsWith('ticket')) {
      if (owner !== msg.author.id || !msg.member.roles.cache.some((r) => r.id === roleID))
        return msg.channel.send(`You need to be a member of ${role.name} to use this command.`);

      if (!tID && !msg.channel.name.startsWith('ticket'))
        return msg.channel.send('You need to supply the ticket channel ID.');

      if (!owner) return msg.channel.send('That is not a valid ticket. Please try again.');
    } else {
      if (owner !== msg.author.id) {
        if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
          return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use this command.`);
        }
      }
      if (!owner) return msg.channel.send('That is not a valid ticket. Please try again.');
    }

    const channel = await msg.guild.channels.cache.get(tID);
    const ticketObj = await db.get(`servers.${msg.guild.id}.tickets.${tID}`);
    if (!channel && !ticketObj) return msg.channel.send('That is not a valid ticket, or has already been closed.');
    const attachment = await discordTranscripts.createTranscript(channel);
    let received;

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Ticket Force Closed')
      .setColor('#E65DF4')
      .addFields([
        { name: 'Ticket Name', value: `${channel.name}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Server', value: msg.guild.name, inline: false },
        { name: 'Closed By', value: `${msg.author} (${msg.author.id})`, inline: false },
      ])
      .setTimestamp();

    const tOwner = await msg.guild.members.cache.get(owner);
    await tOwner?.send({ embeds: [userEmbed], files: [attachment] }).catch(() => {
      received = 'no';
    });

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Ticket Force Closed')
      .addFields([
        { name: 'Author', value: `${tOwner} (${tOwner.id})`, inline: false },
        { name: 'Channel', value: `${channel.name}: ${channel.id}`, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setColor('#E65DF4')
      .setTimestamp();
    if (received === 'no') logEmbed.setFooter({ text: 'Could not message author' });

    await msg.guild.channels.cache
      .get(logID)
      .send({ embeds: [logEmbed], files: [attachment] })
      .catch(() => {});

    await db.delete(`servers.${msg.guild.id}.tickets.${tID}`);
    return msg.channel.delete();
  }
}

module.exports = forceClose;
