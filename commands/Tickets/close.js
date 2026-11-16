const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

    try {
      const [rows] = await this.client.db.execute(
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
        return msg.channel.send('The ticket system has not been setup in this server.');
      }

      if (!msg.guild.members.me.permissions.has('ManageChannels')) {
        return msg.channel.send(
          'Please let a server administrator know the bot is missing Manage Channels permission.',
        );
      }

      const roleID = rows[0].role_id;

      if (!msg.channel.name.startsWith('ticket')) {
        return msg.channel.send('You need to be inside the ticket you want to close.');
      }

      const role = msg.guild.roles.cache.get(roleID);
      const [ownerRows] = await this.client.db.execute(
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
        [msg.guild.id, msg.channel.id],
      );
      const owner = ownerRows[0]?.user_id;

      if (!owner) {
        return msg.channel.send('This ticket does not have an owner.');
      }

      if (owner !== msg.author.id) {
        if (!msg.member.roles.cache.some((r) => r.id === roleID)) {
          return msg.channel.send(`You need to be the ticket owner or a member of ${role.name} to use this command.`);
        }
      }

      // Set closed_at timestamp and close reason in database (transcript will be sent when deleted)
      await this.client.db.execute(
        /* sql */
        `
          UPDATE user_tickets
          SET
            closed_at = NOW(),
            close_reason = ?
          WHERE
            server_id = ?
            AND channel_id = ?
        `,
        [reason, msg.guild.id, msg.channel.id],
      );

      // Make channel view-only
      await msg.channel.permissionOverwrites.set(
        [
          {
            id: msg.guild.roles.everyone.id,
            deny: ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads'],
          },
          {
            id: owner,
            allow: ['ViewChannel', 'ReadMessageHistory'],
            deny: ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads'],
          },
        ],
        'Ticket closed - channel set to view-only',
      );

      const closeEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setColor(msg.settings.embedColor)
        .setDescription(
          stripIndents`This ticket has been closed.
        The channel will be automatically deleted in 24 hours.`,
        )
        .setTimestamp();

      // Create action buttons for closed ticket
      const reopenButton = new ButtonBuilder()
        .setCustomId('reopen_ticket')
        .setLabel('Still Need Help?')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary);

      const deleteButton = new ButtonBuilder()
        .setCustomId('delete_ticket_now')
        .setLabel('Delete Now')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder().addComponents(reopenButton, deleteButton);

      await msg.channel.send({ embeds: [closeEmbed], components: [buttonRow] });
    } catch (err) {
      this.client.logger.error(err);
      this.client.util.errorEmbed(msg, 'An error occurred while trying to close the ticket. Please try again later.');
    }
  }
}

module.exports = CloseTicket;
