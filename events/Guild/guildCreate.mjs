export async function run(client, guild) {
  // Wait 1 second to try and solve guild somehow being undefined
  client.util.wait(1000);

  try {
    client.user.setActivity(
      `${client.settings.get('default').prefix}help | ${client.guilds.cache.size.toLocaleString()} Servers`,
    );
    client.logger.log(`New guild has been joined: ${guild.name} (${guild.id}) with ${guild.memberCount - 1} members`);

    const [timestampRows] = await client.db.execute(
      /* sql */ `
        SELECT
          leave_timestamp
        FROM
          server_settings
        WHERE
          server_id = ?
      `,
      [guild.id],
    );

    const mysqlLeaveTimestamp = timestampRows[0]?.leave_timestamp;

    if (mysqlLeaveTimestamp) {
      await client.db.execute(
        /* sql */ `
          UPDATE server_settings
          SET
            leave_timestamp = DEFAULT
          WHERE
            server_id = ?
        `,
        [guild.id],
      );
    }
  } catch (error) {
    client.logger.error(`GuildCreate: ${error}`);
  }
}
