import { EmbedBuilder } from 'discord.js';

export async function run(client, role) {
  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          role_created
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

    const logSystem = logRows[0].role_created;
    if (logSystem !== 1) return;

    const embed = new EmbedBuilder()
      .setTitle('Role Created')
      .setColor(client.getSettings(role.guild).embedSuccessColor)
      .addFields([
        { name: 'Name', value: role.name },
        { name: 'Managed', value: role.managed.toString() },
        { name: 'Position', value: role.position.toString() },
      ])
      .setFooter({ text: `ID: ${role.id}` })
      .setTimestamp();

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
