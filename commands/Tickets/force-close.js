const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const hastebin = require('hastebin');
const { DateTime } = require('luxon');

class forceClose extends Command {
  constructor(client) {
    super(client, {
      name: 'force-close',
      description: 'Close your or another ticket',
      usage: 'Force-Close [Ticket Channel ID] [Reason]',
      category: 'Tickets',
      aliases: ['fclose', 'forceclose'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!db.get(`servers.${msg.guild.id}.tickets`))
      return msg.channel.send('The ticket system has not been setup in this server.');

    let tID;
    let reason;
    if (msg.channel.name.startsWith('ticket')) {
      if (!args[0]) {
        tID = msg.channel.id;
        reason = 'No reason specified';
      } else if (db.get(`servers.${msg.guild.id}.tickets.${args[0]}`)) {
        tID = args[0];
        args.shift();
        reason = args?.join(' ') || 'No reason specified';
      } else {
        tID = msg.channel.id;
        reason = args?.join(' ') || 'No reason specified';
      }
    } else {
      if (!args[0])
        return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}force-close [Ticket Channel ID] [reason]`);
      tID = args[0];
      args.shift();
      reason = args?.join(' ') || 'No reason specified';
      // not inside tix channel so need tix ID
    }

    const { logID, roleID } = db.get(`servers.${msg.guild.id}.tickets`);

    const owner = db.get(`servers.${msg.guild.id}.tickets.${tID}.owner`);
    msg.guild.members.fetch(owner);
    const role = msg.guild.roles.cache.get(roleID);

    // Are they inside a ticket channel?
    if (!msg.channel.name.startsWith('ticket')) {
      // Do they have the support role?
      if (!msg.member.roles.cache.some((r) => r.id === roleID))
        return msg.channel.send(`You need to be a member of ${role.name} to use force-close.`);
      // Did they supply a ticket ID?
      if (!tID && !msg.channel.name.startsWith('ticket'))
        return msg.channel.send('You need to supply the ticket channel ID.');

      if (!owner) return msg.channel.send('That is not a valid ticket. Please try again.');
    } else {
      // Do they have the support role or are owner?
      if (owner !== msg.author.id) {
        if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
          return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use force-close.`);
        }
      }
    }

    const chan = await msg.guild.channels.cache.find((c) => c.id === tID);
    if (!chan) return msg.channel.send('That is not a valid ticket, or has already been closed.');

    const tName = chan.name;

    // Logging info
    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    const output = `${DateTime.now().toLocaleString(
      DateTime.DATETIME_FULL,
    )} - ${authorName} has requested to force-close this ticket. \nTranscript will be sent to ticket owner.`;

    db.push(`servers.${msg.guild.id}.tickets.${tID}.chatLogs`, output);

    let chatLogs = db.get(`servers.${msg.guild.id}.tickets.${tID}.chatLogs`);
    chatLogs ? (chatLogs = chatLogs.join('\n')) : (chatLogs = 'No Transcript available');

    let url;

    await hastebin
      .createPaste(chatLogs, {
        raw: true,
        contentType: 'text/plain',
        server: 'https://haste.crafters-island.com',
      })
      .then(function (urlToPaste) {
        url = urlToPaste;
      })
      .catch(function (requestError) {
        this.client.logger.error(requestError);
      });

    let received;

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Ticket Closed')
      .setColor('#E65DF4')
      .addFields([
        { name: 'Ticket Name', value: `${tName}`, inline: false },
        { name: 'Transcript URL', value: url, inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Server', value: msg.guild.name, inline: false },
        { name: 'Closed By', value: `${msg.author} (${msg.author.id})`, inline: false },
      ])
      .setFooter({ text: 'Transcripts expire 30 days after last view date.' })
      .setTimestamp();

    const tOwner = await msg.guild.members.cache.get(owner);
    await tOwner.send({ embeds: [userEmbed] }).catch(() => {
      received = 'no';
    });

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setTitle('Ticket Closed')
      .addFields([
        { name: 'Author', value: `${tOwner} (${tOwner.id})`, inline: false },
        { name: 'Channel', value: `${tName}: ${chan.id}`, inline: false },
        { name: 'Transcript URL', value: url, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setColor('#E65DF4')
      .setTimestamp();
    if (received === 'no') logEmbed.setFooter({ text: 'Could not message author.' });
    await msg.guild.channels.cache.get(logID).send({ embeds: [logEmbed] });

    db.delete(`servers.${msg.guild.id}.tickets.${tID}`);
    return msg.channel.delete();
  }
}

module.exports = forceClose;
