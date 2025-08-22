import { EmbedBuilder } from 'discord.js';

export async function run(client, emoji) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          emoji_created
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

    const logSystem = logRows[0].emoji_created;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Emoji Created')
      .setColor(client.getSettings(emoji.guild).embedSuccessColor)
      .setThumbnail(emoji.imageURL())
      .addFields([
        { name: 'Name', value: emoji.name },
        { name: 'Identifier', value: emoji.identifier },
        { name: 'Emoji ID', value: emoji.id },
        { name: 'Is Animated?', value: emoji.animated ? 'True' : 'False' },
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
