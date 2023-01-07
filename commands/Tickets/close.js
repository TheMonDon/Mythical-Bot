const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const hastebin = require('hastebin');
const { DateTime } = require('luxon');

class CloseTicket extends Command {
  constructor (client) {
    super(client, {
      name: 'close-ticket',
      description: 'Close your ticket',
      usage: 'close-ticket [reason]',
      category: 'Tickets',
      aliases: ['close', 'ct', 'closeticket'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const client = this.client;
    const reason = args.join(' ') || 'No reason specified';

    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');
    const { logID } = db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.channel.name.startsWith('ticket')) return msg.channel.send('You need to be inside the ticket you want to close.');

    const tName = msg.channel.name;
    const owner = db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);
    if (owner !== msg.author.id) return msg.channel.send('You need to be the owner of the ticket to close it.');

    // Logging info
    const output = `${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)} - ${msg.author.tag} has requested to close this ticket. \nTranscript will be sent in 5 minutes if no further activity occurs.`;

    db.push(`servers.${msg.guild.id}.tickets.${msg.channel.id}.chatLogs`, output);

    let chatLogs = db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.chatLogs`);
    chatLogs ? chatLogs = chatLogs.join('\n') : chatLogs = 'No Transcript available';

    const em = new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setColor('#E65DF4')
      .setDescription(stripIndents`${msg.author} has requested to close this ticket.
      The ticket will close in 5 minutes if no further activity occurs.`);
    await msg.channel.send({ embeds: [em] });

    const filter = m => m.content?.length > 0;

    const collected = await msg.channel.awaitMessages({
      filter,
      max: 1,
      time: 300000,
      errors: ['time']
    }).catch(() => null); // Throws an error for time and we don't need that.

    if (!collected) {
      let url;

      await hastebin.createPaste(chatLogs, {
        raw: true,
        contentType: 'text/plain',
        server: 'https://haste.crafters-island.com'
      })
        .then(function (urlToPaste) {
          url = urlToPaste;
        })
        .catch(function (requestError) {
          client.logger.error(requestError);
          msg.channel.send('There was an error uploading the logs, Please try again later.');
        });

      let received;

      const userEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setColor('#E65DF4')
        .addFields([
          { name: 'Transcript URL', value: url, inline: false },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Server', value: msg.guild.name, inline: false }
        ])
        .setFooter({ text: 'Transcripts expire 30 days after last view date.' })
        .setTimestamp();
      await msg.author.send({ embeds: [userEmbed] }).catch(() => { received = 'no'; });

      const logEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .setTitle('Ticket Closed')
        .addFields([
          { name: 'Author', value: `${msg.author} (${msg.author.id})`, inline: false },
          { name: 'Channel', value: `${tName}: ${msg.channel.id}`, inline: false },
          { name: 'Transcript URL', value: url, inline: false },
          { name: 'Reason', value: reason, inline: false }
        ])
        .setColor('#E65DF4')
        .setTimestamp();
      if (received === 'no') logEmbed.setFooter({ text: 'Could not message author.' });
      await msg.guild.channels.cache.get(logID).send({ embeds: [logEmbed] }).catch(e => this.client.logger.error(e));

      db.delete(`servers.${msg.guild.id}.tickets.${msg.channel.id}`);
      return msg.channel.delete();
    }

    const response = collected.first().content;
    const embed = new EmbedBuilder()
      .setTitle('Ticket Re-Opened')
      .setDescription(stripIndents`
        Closing of the ticket has been cancelled with the following reason:

        ${response}`)
      .setColor('#E65DF4')
      .setTimestamp();

    const output2 = `Closing of the ticket has been cancelled with the following reason: \n${response}`;
    db.push(`servers.${msg.guild.id}.tickets.${msg.channel.id}.chatLogs`, output2);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = CloseTicket;
