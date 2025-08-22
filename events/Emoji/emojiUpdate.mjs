import { EmbedBuilder } from 'discord.js';

export async function run(client, oldEmoji, newEmoji) {
  if (oldEmoji.name === newEmoji.name && oldEmoji.identifier === newEmoji.identifier) return;

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          emoji_updated
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [oldEmoji.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].emoji_updated;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Emoji Updated')
      .setColor('#EE82EE')
      .setThumbnail(oldEmoji.imageURL())
      .setTimestamp()
      .addFields([
        { name: 'Emoji ID', value: oldEmoji.id, inline: true },
        { name: 'Is Animated?', value: oldEmoji.animated ? 'True' : 'False', inline: true },
      ]);

    if (oldEmoji.name !== newEmoji.name)
      embed.addFields([
        { name: 'Old Name', value: oldEmoji.name, inline: true },
        { name: 'New Name', value: newEmoji.name, inline: true },
      ]);

    if (oldEmoji.identifier !== newEmoji.identifier)
      embed.addFields([
        { name: 'Old Identifier', value: oldEmoji.identifier, inline: true },
        { name: 'New Identifier', value: newEmoji.identifier, inline: true },
      ]);

    let logChannel = oldEmoji.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await oldEmoji.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
