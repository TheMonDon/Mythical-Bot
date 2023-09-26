import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldMember, newMember) {
  const memberName = oldMember.user.discriminator === '0' ? oldMember.user.username : oldMember.user.tag;

  async function TimeoutLogs(oldMember, newMember) {
    const logChan = await db.get(`servers.${oldMember.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${oldMember.guild.id}.logs.logSystem.member-timeout`);
    if (!logSys || logSys !== 'enabled') return;

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
      .setAuthor({ name: memberName, iconURL: oldMember.user.displayAvatarURL() })
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

    const channel = oldMember.guild.channels.cache.get(logChan);
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  try {
    await TimeoutLogs(oldMember, newMember);
  } catch (err) {
    return client.logger.error(err);
  }
}
