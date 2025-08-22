import { ChannelType, EmbedBuilder } from 'discord.js';

export async function run(client, channel) {
  if (channel.type === ChannelType.DM) return;

  const connection = await client.db.getConnection();

  try { 
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          channel_created
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

    const logSystem = logRows[0].channel_created;
    if (logSystem !== 1) return;
    if (channel.name.startsWith('ticket-')) return;

    const embed = new EmbedBuilder()
      .setTitle('Channel Created')
      .setColor(client.getSettings(channel.guild).embedSuccessColor)
      .addFields([
        { name: 'Name', value: channel.name },
        { name: 'Category', value: channel.parent?.name || 'None' },
      ])
      .setFooter({ text: `ID: ${channel.id}` })
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
