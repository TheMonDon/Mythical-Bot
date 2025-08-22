import { EmbedBuilder } from 'discord.js';

export async function run(client, role) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          role_deleted
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [role.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].role_deleted;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Role Deleted')
      .setColor(client.getSettings(role.guild).embedErrorColor)
      .addFields([
        { name: 'Name', value: role.name, inline: true },
        { name: 'Managed', value: client.util.toProperCase(role.managed.toString()), inline: true },
      ])
      .setFooter({ text: `Role ID: ${role.id}` })
      .setTimestamp();

    if (role.hexColor.toString() !== '#000000') {
      embed.addFields({ name: 'Color', value: role.hexColor.toString() });
    }

    let logChannel = role.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await role.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
