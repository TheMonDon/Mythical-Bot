import { EmbedBuilder } from 'discord.js';

export async function run(client, thread) {
  if (thread.joinable) await thread.join();

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          thread_created,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [thread.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].thread_created;
    if (logSystem !== 1) return;
    if (thread.name.startsWith('ticket-')) return;
    if (thread.parent?.name?.startsWith('ticket-')) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
    if (noLogChans.includes(thread.parent?.id)) return;

    const embed = new EmbedBuilder()
      .setTitle('Thread Channel Created')
      .setColor(client.getSettings(thread.guild).embedSuccessColor)
      .addFields([
        { name: 'Name', value: thread.name },
        { name: 'Parent Channel', value: thread.parent?.name || 'None' },
        { name: 'Owner', value: `<@${thread.ownerId}> (${thread.ownerId})` },
      ])
      .setFooter({ text: `ID: ${thread.id}` })
      .setTimestamp();

    let logChannel = thread.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await thread.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
