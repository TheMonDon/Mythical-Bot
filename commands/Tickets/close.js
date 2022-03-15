const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const { stripIndents } = require('common-tags');
const hastebin = require('hastebin');

class Close extends Command {
  constructor (client) {
    super(client, {
      name: 'close',
      description: 'Close your ticket',
      usage: 'close [reason]',
      category: 'Tickets',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const reason = args.join(' ') || 'No reason specified';

    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');
    const { logID } = db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.channel.name.startsWith('ticket')) return msg.channel.send('You need to be inside the ticket you want to close.');

    const tName = msg.channel.name;
    const owner = db.get(`servers.${msg.guild.id}.tickets.${tName}.owner`);
    if (owner !== msg.author.id) return msg.channel.send('You need to be the owner of the ticket to close it.');

    // Logging info
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const timestamp = month + '/' + day + '/' + year + ' ' + hour + ':' + min;

    const output = `${timestamp} - ${msg.author.tag} has requested to close this ticket. \nTranscript will be sent in 5 minutes if no further activity occurs.`;

    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);

    let chatLogs = db.get(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`);
    chatLogs ? chatLogs = chatLogs.join('\n') : chatLogs = 'No Transcript available';

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Ticket Closed')
      .setColor('#E65DF4')
      .setDescription(stripIndents`${msg.author} has requested to close this ticket.
      The ticket will close in 5 minutes if no further activity occurs.`);
    await msg.channel.send({ embeds: [em] });

    const filter = m => m.content.length > 0;

    const collected = await msg.channel.awaitMessages({
      filter,
      max: 1,
      time: 300000,
      errors: ['time']
    });
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
        .catch(function (requestError) { console.log(requestError); });

      let received;

      const userEmbed = new DiscordJS.MessageEmbed()
        .setTitle('Ticket Closed')
        .setColor('#E65DF4')
        .addField('Transcript URL', url, false)
        .addField('Reason', reason, false)
        .addField('Server', msg.guild.name, false)
        .setFooter({ text: 'Transcripts expire 30 days after last view date.' })
        .setTimestamp();
      await msg.author.send({ embeds: [userEmbed] })
        .catch(() => {
          received = 'no';
        });

      const logEmbed = new DiscordJS.MessageEmbed()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .setTitle('Ticket Closed')
        .addField('Author', `${msg.author} (${msg.author.id})`, false)
        .addField('Channel', `${tName}: ${msg.channel.id}`, false)
        .addField('Transcript URL', url, false)
        .addField('Reason', reason, false)
        .setColor('#E65DF4')
        .setTimestamp();
      if (received === 'no') logEmbed.setFooter({ text: 'Could not message author.' });
      await msg.guild.channels.cache.get(logID).send({ embeds: [logEmbed] });

      db.delete(`servers.${msg.guild.id}.tickets.${tName}`);
      return msg.channel.delete();
    }

    const response = collected.first().content;
    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Ticket Re-Opened')
      .setDescription(stripIndents`
        Closing of the ticket has been cancelled with the following reason:
    
        ${response}`)
      .setColor('#E65DF4')
      .setTimestamp();

    const output2 = `Closing of the ticket has been cancelled with the following reason: \n${response}`;
    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output2);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Close;
