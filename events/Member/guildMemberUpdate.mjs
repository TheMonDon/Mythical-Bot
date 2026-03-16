import { EmbedBuilder } from 'discord.js';

export async function run(client, oldMember, newMember) {
  try {
    const [logRows] = await client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [oldMember.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].members_channel_id || logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].member_timeout;
    if (logSystem !== 1) return;

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
  }
}
