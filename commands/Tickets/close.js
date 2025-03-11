const discordTranscripts = require('discord-html-transcripts');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class CloseTicket extends Command {
  constructor(client) {
    super(client, {
      name: 'close-ticket',
      description: 'Close your ticket',
      usage: 'close-ticket [reason]',
      category: 'Tickets',
      aliases: ['close', 'closeticket'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const reason = args.join(' ') || 'No reason specified';

    if (!(await db.get(`servers.${msg.guild.id}.tickets`))) {
      return msg.channel.send('The ticket system has not been setup in this server.');
    }
    const { logID, roleID } = await db.get(`servers.${msg.guild.id}.tickets`);

    if (!msg.channel.name.startsWith('ticket')) {
      return msg.channel.send('You need to be inside the ticket you want to close.');
    }

    const tName = msg.channel.name;
    const role = msg.guild.roles.cache.get(roleID);
    const owner = await db.get(`servers.${msg.guild.id}.tickets.${msg.channel.id}.owner`);
    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use this command.`);
      }
    }

    const em = new EmbedBuilder().setTitle('Ticket Closed').setColor('#E65DF4')
      .setDescription(stripIndents`${msg.author} has requested to close this ticket.
      The ticket will close in 5 minutes if no further activity occurs.
      
      Reason: ${reason}`);
    await msg.channel.send({ embeds: [em] });

    const filter = (m) => m.content?.length > 0;

    const collected = await msg.channel
      .awaitMessages({
        filter,
        max: 1,
        time: 300000,
        errors: ['time'],
      })
      .catch(() => null);

    if (!collected) {
      const attachment = await discordTranscripts.createTranscript(msg.channel);
      let received;

      const userEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setColor('#E65DF4')
        .addFields([
          { name: 'Reason', value: reason, inline: false },
          { name: 'Server', value: msg.guild.name, inline: false },
        ])
        .setTimestamp();
      const user = await this.client.users.fetch(owner);
      await user.send({ embeds: [userEmbed], files: [attachment] }).catch(() => {
        received = 'no';
      });

      const logEmbed = new EmbedBuilder()
        .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
        .setTitle('Ticket Closed')
        .addFields([
          { name: 'Author', value: `<@${owner}> (${owner})`, inline: false },
          { name: 'Channel', value: `${tName}: ${msg.channel.id}`, inline: false },
          { name: 'Reason', value: reason, inline: false },
        ])
        .setColor('#E65DF4')
        .setTimestamp();
      if (received === 'no') logEmbed.setFooter({ text: 'Could not message author' });

      await msg.guild.channels.cache
        .get(logID)
        .send({ embeds: [logEmbed], files: [attachment] })
        .catch((e) => this.client.logger.error(e));

      await db.delete(`servers.${msg.guild.id}.tickets.${msg.channel.id}`);
      return msg.channel.delete();
    }

    const response = collected.first().content;
    const embed = new EmbedBuilder()
      .setTitle('Ticket Re-Opened')
      .setDescription(
        stripIndents`
        Closing of the ticket has been cancelled with the following reason:

        ${response}`,
      )
      .setColor('#E65DF4')
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = CloseTicket;
