import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
import { promisify } from 'util';
const setTimeoutPromise = promisify(setTimeout);
const db = new QuickDB();

export async function run(client, member) {
  async function LogSystem(member) {
    const logChan = await db.get(`servers.${member.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${member.guild.id}.logs.logSystem.member-join`);
    if (!logSys || logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Member Joined')
      .setColor('#3dd0f4')
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
      if (!toggle) {
        connection.release();
        return;
      }

      const [rolesRows] = await connection.execute(
        `SELECT roles FROM persistent_roles WHERE server_id = ? AND user_id = ?`,
        [member.guild.id, member.user.id],
      );
      const roles = rolesRows[0]?.roles ? JSON.parse(rolesRows[0].roles) : [];
      if (!roles) return;

      const reason = 'Added from persistent-roles system';
      try {
        // Try bulk add first
        await member.roles.add(roles, reason);
      } catch (error) {
        console.warn(`Bulk role add failed: ${error.message}`);

        // Fallback: add each role individually
        for (const roleId of roles) {
          try {
            await member.roles.add(roleId, reason);
            await setTimeoutPromise(1000);
          } catch (err) {
            console.warn(`Failed to add role ${roleId}: ${err.message}`);
          }
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
      connection.release();
    } catch (error) {
      connection.release();
      console.error(error);
    }
  }

  async function AssignAutoRoles(member) {
    if (!member || !member.guild) return;
    if (!member.guild.members.me.permissions.has('ManageRoles')) return;

    try {
      const autoRoles = (await db.get(`servers.${member.guild.id}.autoRoles`)) || [];
      if (!autoRoles.length) return;

      for (const roleId of autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.add(role).catch((error) => console.error(error));
          await setTimeoutPromise(1000);
        }
      }
    } catch (error) {
      console.error('Error assigning auto-roles:', error);
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
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  // Run the functions
  WelcomeSystem(client, member);
  await LogSystem(member);
  await PersistentRoles(client, member);
  await AssignAutoRoles(member);
}
