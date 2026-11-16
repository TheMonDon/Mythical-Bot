const discordTranscripts = require('discord-html-transcripts-v2');
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

      const logID = rows[0].logging_id;
      const roleID = rows[0].role_id;

      if (!msg.channel.name.startsWith('ticket')) {
        return msg.channel.send('You need to be inside the ticket you want to close.');
      }

      const tName = msg.channel.name;
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

      let htmlTranscript = null;
      let transcriptIsUploaded = false;
      const components = [];

      // Upload transcript via botpanel if client is configured
      if (this.client.botpanelClient?.connected) {
        try {
          htmlTranscript = await discordTranscripts.createTranscript(msg.channel, {
            returnType: 'string',
            poweredBy: false,
          });
          const transcriptUrl = await this.client.botpanelClient.uploadTranscript(msg.guild.id, htmlTranscript);
          transcriptIsUploaded = true;

          // Create button with link to transcript
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('View Transcript').setStyle(ButtonStyle.Link).setURL(transcriptUrl),
          );
          components.push(row);
        } catch (e) {
          console.error('Failed to upload transcript via botpanel:', e);

          try {
            htmlTranscript = await discordTranscripts.createTranscript(msg.channel, {
              poweredBy: false,
            });
          } catch (err) {
            console.error('Failed to create transcript:', err);
            return msg.channel.send(`Failed to create transcript, please try again later.`);
          }
        }
      } else {
        htmlTranscript = await discordTranscripts.createTranscript(msg.channel, {
          poweredBy: false,
        });
      }

      const user = await this.client.users.fetch(owner);
      const userEmbed = new EmbedBuilder()
        .setTitle('Ticket Closed')
        .setColor(msg.settings.embedColor)
        .addFields([
          { name: 'Reason', value: reason, inline: false },
          { name: 'Server', value: msg.guild.name, inline: false },
          { name: 'Note', value: 'This ticket will be automatically deleted in 24 hours.', inline: false },
        ])
        .setTimestamp();

      let received;
      if (transcriptIsUploaded) {
        await user.send({ embeds: [userEmbed], components }).catch(() => {
          received = false;
        });
      } else {
        await user.send({ embeds: [userEmbed], files: [htmlTranscript] }).catch(() => {
          received = false;
        });
      }

      const logEmbed = new EmbedBuilder()
        .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
        .setTitle('Ticket Closed')
        .setColor(msg.settings.embedColor)
        .addFields([
          { name: 'Author', value: `<@${owner}> (${owner})`, inline: false },
          { name: 'Channel', value: `${tName}: ${msg.channel.id}`, inline: false },
          { name: 'Reason', value: reason, inline: false },
        ])
        .setTimestamp()
        .setFooter({ text: received === false ? 'Could not message author' : '' });

      const logChannel = await msg.guild.channels.cache.get(logID);

      if (transcriptIsUploaded) {
        await logChannel.send({ embeds: [logEmbed], components }).catch((e) => console.error(e));
      } else {
        await logChannel.send({ embeds: [logEmbed], files: [htmlTranscript] }).catch((e) => console.error(e));
      }

      // Set closed_at timestamp in database
      await this.client.db.execute(
        /* sql */
        `
          UPDATE user_tickets
          SET
            closed_at = NOW()
          WHERE
            server_id = ?
            AND channel_id = ?
        `,
        [msg.guild.id, msg.channel.id],
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

      await msg.channel.send({ embeds: [closeEmbed] });
    } catch (err) {
      this.client.logger.error(err);
      this.client.util.errorEmbed(msg, 'An error occurred while trying to close the ticket. Please try again later.');
    }
  }
}

module.exports = CloseTicket;
