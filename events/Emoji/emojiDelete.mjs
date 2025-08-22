import { EmbedBuilder } from 'discord.js';

export async function run(client, emoji) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          emoji_deleted
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [emoji.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].emoji_deleted;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Emoji Deleted')
      .setColor(client.getSettings(emoji.guild).embedErrorColor)
      .setThumbnail(emoji.imageURL())
      .addFields([
        { name: 'Name', value: emoji.name, inline: true },
        { name: 'Identifier', value: emoji.identifier, inline: true },
        { name: 'Emoji ID', value: emoji.id, inline: true },
        { name: 'Was Animated?', value: emoji.animated ? 'True' : 'False', inline: true },
      ])
      .setTimestamp();

    let logChannel = emoji.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await emoji.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
