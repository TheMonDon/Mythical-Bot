import { EmbedBuilder } from 'discord.js';
import { promisify } from 'util';
const setTimeoutPromise = promisify(setTimeout);

export async function run(client, member) {
  async function LogSystem(client, member) {
    const connection = await client.db.getConnection();

    try {
      const [logRows] = await connection.execute(
        /* sql */ `
          SELECT
            channel_id,
            member_join
          FROM
            log_settings
          WHERE
            server_id = ?
        `,
        [member.guild.id],
      );
      if (!logRows.length) return;

      const logChannelID = logRows[0].channel_id;
      if (!logChannelID) return;

      const logSystem = logRows[0].member_join;
      if (logSystem !== 1) return;

      const embed = new EmbedBuilder()
        .setTitle('Member Joined')
        .setColor(client.getSettings(member.guild).embedSuccessColor)
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setThumbnail(member.user.displayAvatarURL())
        .addFields([
          {
            name: 'User',
            value: `${member.toString()} \`${member.user.tag}\` `,
          },
          { name: 'Member Count', value: member.guild.memberCount.toString() },
        ])
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp();

      let logChannel = member.guild.channels.cache.get(logChannelID);
      if (!logChannel) {
        logChannel = await member.guild.channels.fetch(logChannelID);
      }

      if (!logChannel) return;

      return logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
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

      const [rolesRows] = await connection.execute(
        `SELECT roles FROM persistent_roles WHERE server_id = ? AND user_id = ?`,
        [member.guild.id, member.user.id],
      );
      const roles = rolesRows[0]?.roles ? JSON.parse(rolesRows[0].roles) : [];
      if (!roles.length) return;

      const reason = 'Added from persistent-roles system';
      try {
        // Try bulk add first
        await member.roles.add(roles, reason);
      } catch (error) {
        // Fallback: add each role individually
        for (const roleId of roles) {
          try {
            await member.roles.add(roleId, reason);
            await setTimeoutPromise(1000);
          } catch (err) {}
        }
      }

      await connection.execute(
        /* sql */ `
          DELETE FROM persistent_roles
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [member.guild.id, member.user.id],
      );
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  }

  async function AssignAutoRoles(client, member) {
    if (!member || !member.guild) return;
    if (!member.guild.members.me.permissions.has('ManageRoles')) return;

    const connection = await client.db.getConnection();

    try {
      const [autoRoleRows] = await connection.execute(
        /* sql */ `
          SELECT
            roles
          FROM
            auto_roles
          WHERE
            server_id = ?
        `,
        [member.guild.id],
      );

      const autoRoles = autoRoleRows[0]?.roles ? JSON.parse(autoRoleRows[0].roles) : [];
      if (!autoRoles.length) return;

      const reason = 'Added from persistent-roles system';
      try {
        // Try bulk add first
        await member.roles.add(autoRoles, reason);
      } catch (error) {
        // Fallback: add each role individually
        for (const roleId of autoRoles) {
          try {
            await member.roles.add(roleId, reason);
            await setTimeoutPromise(1000);
          } catch (err) {}
        }
      }
    } catch (error) {
      console.error('Error assigning auto-roles:', error);
    } finally {
      connection.release();
    }
  }

  function WelcomeSystem(client, member) {
    // Load the guild's settings
    const settings = client.getSettings(member.guild);

    // If welcome is off, don't proceed (don't welcome the user)
    if (settings.welcomeEnabled !== 'true') return;

    // Replace the placeholders in the welcome message with actual data

    const welcomeMessage = settings.welcomeMessage
      .replace('{{user}}', member.user.tag)
      .replace('{{userName}}', member.user.tag)
      .replace('{{globalName}}', member.user.globalName || member.user.id)
      .replace('{{guild}}', member.guild.name)
      .replace('{{guildName}}', member.guild.name);

    const embed = new EmbedBuilder()
      .setTitle('Member Joined')
      .setColor(settings.embedColor)
      .setTitle(`Welcome to ${member.guild.name}`)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(welcomeMessage)
      .setTimestamp();

    const context = { guild: member.guild };
    const channel = client.util.getChannel(context, settings.welcomeChannel);
    if (!channel) return;
    return channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Run the functions
  WelcomeSystem(client, member);
  await LogSystem(client, member);
  await PersistentRoles(client, member);
  await AssignAutoRoles(client, member);
}
