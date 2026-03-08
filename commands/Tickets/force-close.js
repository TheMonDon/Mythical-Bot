const discordTranscripts = require('discord-html-transcripts');
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
    const connection = await this.client.db.getConnection();

    try {
      // Get ticket settings
      const [settingsRows] = await connection.execute(
        /* sql */
        `
          SELECT
            logging_id,
            role_id
          FROM
            ticket_settings
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );

      if (settingsRows.length === 0) {
        return msg.channel.send('The ticket system has not been setup in this server.');
      }

      const { logging_id: logID, role_id: roleID } = settingsRows[0];
      const supportRole = msg.guild.roles.cache.get(roleID);

      let tID;
      let reason;

      // Determine ticket ID
      if (msg.channel.name.startsWith('ticket')) {
        if (!args[0]) {
          tID = msg.channel.id;
          reason = 'No reason specified';
        } else {
          tID = args[0];
          args.shift();
          reason = args.join(' ') || 'No reason specified';
        }
      } else {
        if (!args[0]) {
          return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}force-close [Ticket Channel ID] [Reason]`);
        }

        tID = args[0];
        args.shift();
        reason = args.join(' ') || 'No reason specified';
      }

      const channel = msg.guild.channels.cache.get(tID);
      if (!channel) {
        return msg.channel.send('That is not a valid ticket channel.');
      }

      // Get ticket owner
      const [ticketRows] = await connection.execute(
        /* sql */
        `
          SELECT
            user_id
          FROM
            user_tickets
          WHERE
            server_id = ?
            AND channel_id = ?
        `,
        [msg.guild.id, tID],
      );

      if (ticketRows.length === 0) {
        return msg.channel.send('That is not a valid ticket or it has already been closed.');
      }

      const owner = ticketRows[0].user_id;

      // Permission check
      const isOwner = owner === msg.author.id;
      const isStaff = msg.member.roles.cache.has(roleID);

      if (!isOwner && !isStaff) {
        return msg.channel.send(
          `You must be the ticket owner or a member of ${supportRole?.name} to use this command.`,
        );
      }

      const transcript = await discordTranscripts.createTranscript(channel);

      const ownerMember = await msg.guild.members.fetch(owner).catch(() => null);

      let received;

      const userEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setTitle('Ticket Force Closed')
        .setColor('#E65DF4')
        .addFields([
          { name: 'Ticket Name', value: channel.name },
          { name: 'Reason', value: reason },
          { name: 'Server', value: msg.guild.name },
          { name: 'Closed By', value: `${msg.author} (${msg.author.id})` },
        ])
        .setTimestamp();

      await ownerMember?.send({ embeds: [userEmbed], files: [transcript] }).catch(() => {
        received = 'no';
      });

      const logEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setTitle('Ticket Force Closed')
        .setColor('#E65DF4')
        .addFields([
          { name: 'Author', value: `${ownerMember} (${owner})` },
          { name: 'Channel', value: `${channel.name}: ${channel.id}` },
          { name: 'Reason', value: reason },
        ])
        .setTimestamp();

      if (received === 'no') {
        logEmbed.setFooter({ text: 'Could not message author' });
      }

      await msg.guild.channels.cache
        .get(logID)
        ?.send({ embeds: [logEmbed], files: [transcript] })
        .catch(() => {});

      // Remove ticket from database
      await connection.execute(
        /* sql */
        `
          DELETE FROM user_tickets
          WHERE
            server_id = ?
            AND channel_id = ?
        `,
        [msg.guild.id, tID],
      );

      await channel.delete();
    } catch (err) {
      this.client.logger.error(err);
      this.client.util.errorEmbed(
        msg,
        'An error occurred while trying to force close the ticket. Please try again later.',
      );
    } finally {
      connection.release();
    }
  }
}

module.exports = forceClose;
