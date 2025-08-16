import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, member) {
  async function LogSystem(member) {
    const logChan = await db.get(`servers.${member.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${member.guild.id}.logs.logSystem.member-leave`);
    if (!logSys || logSys !== 'enabled') return;

    const roles = [...member.roles.cache.values()];
    const roleString = roles
      .sort((a, b) => a.position - b.position)
      .map((role) => role.name)
      .join(', ');

    const embed = new EmbedBuilder()
      .setTitle('Member Left')
      .setColor('#3dd0f4')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setThumbnail(member.user.displayAvatarURL())
      .addFields([
        {
          name: 'User',
          value: `${member.toString()} \`${member.user.tag}\` `,
        },
        { name: 'Member Count', value: member.guild.memberCount.toString() },
        { name: 'Roles', value: roleString },
      ])
      .setFooter({ text: `ID: ${member.user.id}` })
      .setTimestamp();

    const channel = member.guild.channels.cache.get(logChan);
    if (!channel) return;
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  async function PersistentRoles(client, member) {
    if (!member || !member.guild) return;
    if (!member.guild.members.me.permissions.has('ManageRoles')) return;
    if (member.user.bot) return;

    const connection = await client.db.getConnection();

    try {
      const [toggleRows] = await connection.execute(
        `SELECT persistent_roles FROM server_settings WHERE server_id = ?`,
        [member.guild.id],
      );

      const toggle = toggleRows[0]?.persistent_roles === 1;
      if (!toggle) return;

      const bans = await member.guild.bans.fetch();
      const bannedUser = bans.find((ban) => ban.user.id === member.id);
      if (bannedUser) return;

      const roles = [...member.roles.cache.values()];
      if (roles.length === 1) return;
      const arr = roles.filter((role) => role.id !== member.guild.id).map((role) => role.id);

      connection.execute(
        `INSERT INTO persistent_roles (server_id, user_id, roles)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE roles = VALUES(roles)`,
        [member.guild.id, member.user.id, JSON.stringify(arr)],
      );
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  }

  function LeaveSystem(client, member) {
    const settings = client.getSettings(member.guild);

    if (settings.leaveEnabled !== 'true') return;

    // Replace the placeholders in the leave message with actual data
    const leaveMessage = settings.leaveMessage
      .replace('{{user}}', member.user.tag)
      .replace('{{userName}}', member.user.tag)
      .replace('{{globalName}}', member.user.globalName || member.user.id)
      .replace('{{guild}}', member.guild.name)
      .replace('{{guildName}}', member.guild.name);

    const em = new EmbedBuilder()
      .setColor(settings.embedColor)
      .setTitle('Member Left')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(leaveMessage)
      .setTimestamp();

    const context = { guild: member.guild };
    const channel = client.util.getChannel(context, settings.leaveChannel);
    if (!channel) return;
    channel.send({ embeds: [em] }).catch(() => {});
  }

  // Run the functions
  LeaveSystem(client, member);
  await LogSystem(member);
  await PersistentRoles(client, member);
}
