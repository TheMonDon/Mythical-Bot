import { EmbedBuilder } from 'discord.js';

export async function run(client, channel) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          channel_deleted,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [channel.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].channel_deleted;
    if (logSystem !== 1) return;
    if (channel.name.startsWith('ticket-')) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
    if (noLogChans.includes(channel.id)) return;

    const embed = new EmbedBuilder()
      .setTitle('Channel Deleted')
      .setColor(client.getSettings(channel.guild).embedErrorColor)
      .addFields([
        { name: 'Name', value: channel.name },
        { name: 'Category', value: channel.parent?.name || 'None' },
      ])
      .setFooter({ text: `Channel ID: ${channel.id}` })
      .setTimestamp();

    let logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await channel.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
