const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class DeleteWarning extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-warning',
      description: 'Delete a specific warnings case',
      usage: 'delete-warning <CaseID>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: [
        'delwarn',
        'deletecase',
        'deletewarn',
        'delcase',
        'clearcase',
        'deletewarning',
        'delwarning',
        'del-warn',
        'remove-warning',
      ],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    let title = 'Case Cleared';
    let color = msg.settings.embedColor;

    try {
      await msg.delete();

      const caseID = args.join(' ');
      const [[warning]] = await connection.execute(
        /* sql */ `
          SELECT
            *
          FROM
            warns
          WHERE
            server_id = ?
            AND warn_id = ?
        `,
        [msg.guild.id, caseID],
      );

      if (!warning) {
        return this.client.util.errorEmbed(msg, 'Warning case not found', 'Invalid Case ID');
      }

      const [settingsRows] = await connection.execute(
        /* sql */ `
          SELECT
            warn_log_channel
          FROM
            server_settings
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );
      const logChan = settingsRows[0]?.warn_log_channel;
      const warnReason = warning.reason || 'No reason specified';

      // Get total points before
      const [[beforeRow]] = await connection.execute(
        /* sql */
        `
          SELECT
            COALESCE(SUM(points), 0) AS totalPoints
          FROM
            warns
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [msg.guild.id, warning.user_id],
      );
      const previousPoints = Number(beforeRow.totalPoints);

      // Get the points of the warn being deleted
      const [[warnRow]] = await connection.execute(
        /* sql */ `
          SELECT
            points
          FROM
            warns
          WHERE
            server_id = ?
            AND warn_id = ?
        `,
        [msg.guild.id, caseID],
      );
      const deletedPoints = warnRow ? Number(warnRow.points) : 0;

      // Delete the warn
      await connection.execute(
        /* sql */ `
          DELETE FROM warns
          WHERE
            server_id = ?
            AND warn_id = ?
        `,
        [msg.guild.id, caseID],
      );

      // Calculate new total
      const newerPoints = previousPoints - deletedPoints;

      if (previousPoints >= 10 && newerPoints < 10) {
        if (!msg.guild.members.me.permissions.has('BanMembers')) {
          this.client.util.errorEmbed(
            msg,
            'Please unban the user manually, the bot does not have Ban Members permission.',
            'Missing Permission',
          );
        } else {
          await msg.guild.members.unban(warning.user_id).catch(() => null);
          title += ' & User Unbanned';
          color = msg.settings.embedSuccessColor;
        }
      } else {
        color = msg.settings.embedSuccessColor;
      }

      // Get the user from cache, if they don't exist then force fetch them
      let user = this.client.users.cache.get(warning.user_id);
      if (!user) {
        user = await this.client.users.fetch(warning.user_id);
      }

      const userEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields([
          { name: 'Moderator', value: `${msg.author} (${msg.author.id})`, inline: true },
          { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
          { name: 'Case Reason', value: warnReason, inline: true },
          { name: 'Issued In', value: msg.guild.name, inline: true },
        ]);
      let userMessage;
      if (user) {
        userMessage = await user.send({ embeds: [userEmbed] }).catch(() => null);
      }

      let userString;
      if (user) {
        userString = `${user} (${user.id})`;
      } else {
        userString = 'Unknown User';
      }

      const logEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields([
          { name: 'Moderator', value: `${msg.author} (${msg.author.id})`, inline: true },
          { name: 'User', value: userString, inline: true },
          { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
          { name: 'Case Reason', value: warnReason, inline: true },
        ]);
      if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

      if (logChan) {
        const channelEmbed = new EmbedBuilder()
          .setTitle(title)
          .setColor(color)
          .addFields([
            { name: 'User', value: userString, inline: true },
            { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
          ]);

        await msg.channel.send({ embeds: [channelEmbed] }).then((embed) => {
          setTimeout(() => embed.delete(), 30000);
        });

        return msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
      } else {
        return msg.channel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error('Delete-Warning Error:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = DeleteWarning;
