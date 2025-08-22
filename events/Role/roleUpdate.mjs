import { EmbedBuilder } from 'discord.js';

export async function run(client, oldRole, newRole) {
  if (oldRole === newRole) return;
  if (oldRole.name === newRole.name && oldRole.hexColor === newRole.hexColor) return;

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          role_updated
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [oldRole.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].role_updated;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle(`Role "${oldRole.name}" Updated`)
      .setColor(newRole.hexColor)
      .setFooter({ text: `ID: ${newRole.id}` })
      .setTimestamp();

    if (oldRole.name !== newRole.name) {
      embed.addFields([{ name: 'New Name', value: newRole.name, inline: true }]);
    }

    if (oldRole.hexColor !== newRole.hexColor) {
      embed.addFields([
        { name: 'Old Color', value: oldRole.hexColor.toString(), inline: true },
        { name: 'New Color', value: newRole.hexColor.toString(), inline: true },
      ]);
    }

    if (embed.data.fields?.length === 0) return;

    let logChannel = oldRole.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await oldRole.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
