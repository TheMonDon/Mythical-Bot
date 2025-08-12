const discordTranscripts = require('discord-html-transcripts');
const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

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

    const connection = await this.client.db.getConnection();
    const [rows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          ticket_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );

    if (rows.length === 0) {
      connection.release();
      return msg.channel.send('The ticket system has not been setup in this server.');
    }

    if (!msg.guild.members.me.permissions.has('ManageChannels')) {
      connection.release();
      return msg.channel.send('Please let a server administrator know the bot is missing Manage Channels permission.');
    }

    const logID = rows[0].logging_id;
    const roleID = rows[0].role_id;

    if (!msg.channel.name.startsWith('ticket')) {
      connection.release();
      return msg.channel.send('You need to be inside the ticket you want to close.');
    }

    const tName = msg.channel.name;
    const role = msg.guild.roles.cache.get(roleID);
    const [ownerRows] = await connection.execute(
      `SELECT user_id FROM user_tickets WHERE server_id = ? AND channel_id = ?`,
      [msg.guild.id, msg.channel.id],
    );
    const owner = ownerRows[0]?.user_id;

    if (!owner) {
      connection.release();
      return msg.channel.send('This ticket does not have an owner.');
    }

    if (owner !== msg.author.id) {
      if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
        connection.release();
        return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use this command.`);
      }
    }

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setTitle('Ticket Closed')
      .setColor('#E65DF4').setDescription(stripIndents`${msg.author} has requested to close this ticket.
        The ticket will close in 5 minutes if no further activity occurs.
      
        Reason: ${reason}
      `);
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

      await connection.execute(
        `DELETE FROM user_tickets 
           WHERE server_id = ? AND channel_id = ?`,
        [msg.guild.id, msg.channel.id],
      );
      connection.release();

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

    connection.release();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = CloseTicket;
