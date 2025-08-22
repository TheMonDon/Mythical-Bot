import { EmbedBuilder } from 'discord.js';

export async function run(client, oldMember, newMember) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          member_timeout
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [oldMember.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].member_timeout;
    if (logSystem !== 1) return;

    // Fetch all members
    await oldMember.guild.members.fetch();
    if (oldMember.isCommunicationDisabled() === newMember.isCommunicationDisabled()) return;

    let executor;
    let reason;
    if (oldMember.guild.members.me.permissions.has('ViewAuditLog')) {
      try {
        const entries = await newMember.guild.fetchAuditLogs().then((audit) => audit.entries);
        executor = entries.first().executor;
        reason = entries.first().reason;
      } catch (error) {
        client.logger.error(error);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(client.getSettings(oldMember.guild).embedSuccessColor)
      .setAuthor({ name: oldMember.user.tag, iconURL: oldMember.user.displayAvatarURL() })
      .setThumbnail(oldMember.user.displayAvatarURL())
      .setTimestamp();

    if (newMember.isCommunicationDisabled()) {
      const time = Math.floor(new Date(newMember.communicationDisabledUntilTimestamp).getTime() / 1000);

      embed.setTitle('Member Timeout Added').addFields([
        { name: 'User', value: oldMember.toString() },
        { name: 'Timeout Removal', value: `<t:${time}:f>` || 'N/A' },
      ]);

      if (executor) embed.addFields([{ name: 'Moderator', value: executor.toString() }]);
      if (reason) embed.addFields([{ name: 'Reason', value: reason.toString() }]);
    } else {
      embed.setTitle('Member Timeout Removed').addFields([{ name: 'User', value: oldMember.toString() }]);
      if (executor) embed.addFields([{ name: 'Moderator', value: executor.toString() }]);
    }

    let logChannel = oldMember.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await oldMember.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
