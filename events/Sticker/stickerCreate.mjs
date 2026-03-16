import { EmbedBuilder } from 'discord.js';

export async function run(client, sticker) {
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
      [sticker.guildId],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].misc_channel_id || logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].sticker_created;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Sticker Created')
      .setColor(client.getSettings(sticker.guildId).embedSuccessColor)
      .setThumbnail(sticker.url)
      .addFields([
        { name: 'Name', value: sticker.name },
        { name: 'Sticker ID', value: sticker.id },
        { name: 'Description', value: sticker.description || 'None provided' },
        { name: 'Tags', value: sticker.tags },
      ])
      .setTimestamp();

    let guild = client.guilds.cache.get(sticker.guildId);
    if (!guild) {
      guild = await client.guilds.fetch(sticker.guildId);
    }

    let logChannel = guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  }
}
