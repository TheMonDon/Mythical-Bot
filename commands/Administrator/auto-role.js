const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class AutoRole extends Command {
  constructor(client) {
    super(client, {
      name: 'auto-role',
      category: 'Administrator',
      description: 'Manage auto-roles in the server',
      longDescription:
        'Auto-roles automatically assign specific roles to new members when they join the server, making onboarding seamless and hassle-free.',
      usage: 'auto-role <add | remove | list> [role or page]',
      aliases: ['autorole', 'autoroles'],
      permLevel: 'Administrator',
      examples: ['auto-role add @member', 'auto-role remove Moderator'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    const action = args[0].toLowerCase();
    args.shift();
    const roleName = args.join(' ');

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    try {
      if (!msg.guild.members.me.permissions.has('ManageRoles')) {
        return this.client.util.errorEmbed(msg, 'The bot requires Manage Roles permission to use this feature.');
      }

      const [autoRoleRows] = await connection.execute(
        /* sql */ `
          SELECT
            roles
          FROM
            auto_roles
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );
      let autoRoles = autoRoleRows[0]?.roles ? JSON.parse(autoRoleRows[0].roles) : [];

      switch (action) {
        case 'add': {
          if (!roleName) return msg.channel.send('Please specify a role to add.');

          const role = this.client.util.getRole(msg, roleName.toLowerCase());
          if (!role) {
            return this.client.util.errorEmbed(msg, 'That role was not found.');
          }

          if (autoRoles.includes(role.id)) {
            return this.client.util.errorEmbed(msg, 'That role is already added as an auto-role.');
          }

          autoRoles.push(role.id);
          await connection.execute(
            `
            INSERT INTO auto_roles (server_id, roles)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE roles = VALUES(roles)`,
            [msg.guild.id, JSON.stringify(autoRoles)],
          );

          embed.setDescription(`The ${role} role will be given to all new members when they join the server.`);
          return msg.channel.send({ embeds: [embed] });
        }

        case 'remove': {
          if (!roleName) return msg.channel.send('Please specify a role to remove.');

          const role = this.client.util.getRole(msg, roleName.toLowerCase());
          if (!role) {
            return this.client.util.errorEmbed(msg, 'That role was not found.');
          }

          if (!autoRoles.includes(role.id)) {
            return this.client.util.errorEmbed(msg, `The \`${role}\` role is not as as an auto-role.`);
          }

          autoRoles = autoRoles.filter((r) => r !== role.id);
          await connection.execute(
            `
            INSERT INTO auto_roles (server_id, roles)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE roles = VALUES(roles)`,
            [msg.guild.id, JSON.stringify(autoRoles)],
          );

          embed.setDescription(`The ${role} role will no longer be given to new members when they join the server.`);
          return msg.channel.send({ embeds: [embed] });
        }

        case 'list': {
          // Fetch all roles to ensure uncached roles are included
          const allRoles = await msg.guild.roles.fetch();

          // Remove roles that are no longer in the server
          const validRoles = autoRoles.filter((roleId) => allRoles.has(roleId));

          // Update the database if roles were removed
          if (validRoles.length !== autoRoles.length) {
            await db.set(`servers.${msg.guild.id}.autoRoles`, validRoles);
            embed
              .setDescription('No valid auto-roles remain in the server. The list has been updated.')
              .setColor(msg.settings.embedColor);
            return msg.channel.send({ embeds: [embed] });
          }

          // If no valid roles remain, send an appropriate message
          if (validRoles.length === 0) {
            embed
              .setDescription(
                `There are no auto-roles in this server. \n\nUsage: \`${msg.settings.prefix}${this.help.usage}\``,
              )
              .setColor(msg.settings.embedColor);
            return msg.channel.send({ embeds: [embed] });
          }

          let page = parseInt(roleName) || 1;
          const itemsPerPage = 10;
          const maxPages = Math.ceil(validRoles.length / itemsPerPage);

          if (page > maxPages) page = maxPages;
          if (page < 1) page = 1;

          const start = (page - 1) * itemsPerPage;
          const end = start + itemsPerPage;
          const roles = validRoles.slice(start, end).map((roleId) => {
            const role = allRoles.get(roleId);
            return role ? role.toString() : `Unknown Role (${roleId})`;
          });

          const roleEmbed = new EmbedBuilder()
            .setTitle('Auto-Roles')
            .addFields(roles.map((role, index) => ({ name: `${start + index + 1}.`, value: role })))
            .setColor(msg.settings.embedColor)
            .setFooter({ text: `Page ${page} / ${maxPages}` })
            .setTimestamp();

          return msg.channel.send({ embeds: [roleEmbed] });
        }

        default: {
          return msg.channel.send('Invalid action. Use `add`, `remove`, or `list`.');
        }
      }
    } catch (error) {
      console.error('Auto-Role command error:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = AutoRole;
