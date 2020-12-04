const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const hastebin = require('hastebin');

class forceClose extends Command {
  constructor(client) {
    super(client, {
      name: 'force-close',
      description: 'Close your or another ticket',
      usage: 'force-close [ticket-ID] [reason]',
      category: 'Tickets',
      aliases: ['fclose', 'forceclose'],
      guildOnly: true
    });
  }

  async run(msg, args) {
    if (!db.get(`servers.${msg.guild.id}.tickets`)) return msg.channel.send('The ticket system has not been setup in this server.');

    let tName;
    let reason;
    if (msg.channel.name.startsWith('ticket')) {
      if (!args[0]) {
        tName = msg.channel.name;
        reason = 'No reason specified';
      } else if (db.get(`servers.${msg.guild.id}.tickets.${args[0]}`)) {
        tName = args[0];
        args.shift();
        reason = args && args.join(' ') || 'No reason specified';
      } else {
        tName = msg.channel.name;
        reason = args && args.join(' ') || 'No reason specified';
      }
    } else {
      if (!args[0]) {
        return msg.channel.send(`Incorrect Usage: ${msg.settings.preifx}force-close [ticket-ID] [reason]`)
      }
      tName = args[0];
      args.shift();
      reason = args && args.join(' ') || 'No reason specified';
      // not inside tix channel so need tix ID
    }

    const { logID, roleID } = db.get(`servers.${msg.guild.id}.tickets`);

    const owner = db.get(`servers.${msg.guild.id}.tickets.${tName}.owner`);
    const role = msg.guild.roles.cache.get(roleID);

    // Are they inside a ticket channel?
    if (!msg.channel.name.startsWith('ticket')) {
      // Do they have the support role?
      if (!msg.member.roles.cache.some(r => r.id === roleID)) {
        return msg.channel.send(`You need to be a member of ${role.name} to use force-close.`);
      }
      // Did they supply a ticket ID?
      if (!tName) {
        if (!msg.channel.name.startsWith('ticket')) return msg.channel.send('You need to supply the ticket ID.');
      }

      if (!owner) return msg.channel.send('That is not a valid ticket. Please try again.');

    } else {
      // Do they have the support role or are owner?
      if (owner !== msg.author.id) {
        if (!msg.member.roles.cache.some(r => r.id === roleID)) {
          return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use force-close.`);
        }
      }
    }

    const chan = await msg.guild.channels.cache.find(c => c.name === tName);
    if (!chan) return msg.channel.send('That is not a valid ticket, or has already been closed.');

    // Logging info
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const timestamp = month + "/" + day + "/" + year + " " + hour + ":" + min;

    const output = `${timestamp} - ${msg.author.tag} has requested to force-close this ticket. \nTranscript will be sent to ticket owner.`;

    db.push(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`, output);

    let chatLogs = db.get(`servers.${msg.guild.id}.tickets.${tName}.chatLogs`);
    chatLogs ? chatLogs = chatLogs.join('\n') : chatLogs = 'No Transcript available';

    let url;

    await hastebin.createPaste(chatLogs, {
      raw: true,
      contentType: 'text/plain',
      server: 'https://hastebin.com'
    })
      .then(function (urlToPaste) {
        url = urlToPaste;
      })
      .catch(function (requestError) { console.log(requestError) })

    let recieved;

    const tOwner = await msg.guild.members.cache.get(owner);

    const userEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle('Ticket Closed')
      .setColor('#E65DF4')
      .addField('Ticket Name', `${tName}`, false)
      .addField('Transcript URL', url, false)
      .addField('Reason', reason, false)
      .addField('Closed By', `${msg.author} (${msg.author.id})`, false)
      .setFooter('Transcripts expire 30 days after last view date.')
      .setTimestamp();
    await tOwner.send(userEmbed)
      .catch(() => {
        recieved = 'no';
      });

    const logEmbed = new DiscordJS.MessageEmbed()
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setTitle('Ticket Closed')
      .addField('Author', `${tOwner} (${tOwner.id})`, false)
      .addField('Channel', `${tName}: ${chan.id}`, false)
      .addField('Transcript URL', url, false)
      .addField('Reason', reason, false)
      .setColor('#E65DF4')
      .setTimestamp();
    if (recieved === 'no') logEmbed.setFooter('Could not message author.');
    await msg.guild.channels.cache.get(logID).send(logEmbed);

    db.delete(`servers.${msg.guild.id}.tickets.${tName}`);
    return msg.channel.delete()
  }
}

module.exports = forceClose;
