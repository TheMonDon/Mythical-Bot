import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, guild) {
  // Wait 1 second to try and solve guild somehow being undefined
  client.util.wait(1000);
  const connection = await client.db.getConnection();

  try {
    client.user.setActivity(
      `${client.settings.get('default').prefix}help | ${client.guilds.cache.size.toLocaleString()} Servers`,
    );
    client.logger.log(`New guild has been joined: ${guild.name} (${guild.id}) with ${guild.memberCount - 1} members`);

    const leaveTimestamp = await db.get(`servers.${guild.id}.leave_timestamp`);
    if (leaveTimestamp) {
      await db.delete(`servers.${guild.id}.leave_timestamp`);
    }

    const [timestampRows] = await connection.execute(
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
      await connection.execute(
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

    connection.release();
  } catch (error) {
    connection.release();
    client.logger.error(`GuildCreate: ${error}`);
  }
}
