const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class AutoRole extends Command {
  constructor(client) {
    super(client, {
      name: 'auto-role',
      category: 'Administrator',
      description: 'Manage auto-roles in the server.',
      usage: 'auto-role <add | remove | list> [role or page]',
      aliases: ['autorole', 'autoroles'],
      permLevel: 'Administrator',
      examples: ['auto-role add @member', 'auto-role remove @Moderator'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const action = args[0].toLowerCase();
    args.shift();
    const roleName = args.join(' ');

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });

    switch (action) {
      case 'add': {
        if (!roleName) return msg.channel.send('Please specify a role to add.');

        const role = this.client.util.getRole(msg, roleName.toLowerCase());
        if (!role) {
          embed.setDescription('Role not found').setColor(msg.settings.embedErrorColor);
          return msg.channel.send({ embeds: [embed] });
        }

        const autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];
        if (autoRoles.includes(role.id)) {
          embed.setDescription('This role is already set as an auto-role.');
          return msg.channel.send({ embeds: [embed] });
        }

        autoRoles.push(role.id);
        await db.set(`servers.${msg.guild.id}.autoRoles`, autoRoles);

        embed.setDescription(`The ${role} role will be given to all new members when they join the server..`);
        return msg.channel.send({ embeds: [embed] });
      }

      case 'remove': {
        if (!roleName) return msg.channel.send('Please specify a role to remove.');

        const role = this.client.util.getRole(msg, roleName.toLowerCase());
        if (!role) {
          embed.setDescription('Role not found').setColor(msg.settings.embedErrorColor);
          return msg.channel.send({ embeds: [embed] });
        }

        let autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];
        if (!autoRoles.includes(role.id)) {
          embed.setDescription(`The ${role} role is not as as an auto-role.`).setColor(msg.settings.embedErrorColor);
          return msg.channel.send({ embeds: [embed] });
        }

        autoRoles = autoRoles.filter((r) => r !== role.id);
        await db.set(`servers.${msg.guild.id}.autoRoles`, autoRoles);

        embed.setDescription(`The ${role} role will no longer be given to new members when they join the server.`);
        return msg.channel.send({ embeds: [embed] });
      }

      case 'list': {
        const autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];
        if (autoRoles.length === 0) {
          embed.setDescription('No auto-roles have been set.').setColor(msg.settings.embedErrorColor);
          return msg.channel.send({ embeds: [embed] });
        }

        let page = parseInt(roleName) || 1;
        const itemsPerPage = 10;
        const maxPages = Math.ceil(autoRoles.length / itemsPerPage);

        if (page > maxPages) page = maxPages;
        if (page < 1) page = 1;

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const roles = autoRoles.slice(start, end).map((roleId) => {
          const role = msg.guild.roles.cache.get(roleId);
          return role ? role.name : `Unknown Role (${roleId})`;
        });

        const roleEmbed = new EmbedBuilder()
          .setTitle('Auto-Roles')
          .addFields(roles.map((role, index) => ({ name: `${start + index + 1}.`, value: role })))
          .setColor(msg.settings.embedColor)
          .setFooter({ text: `Page ${page} / ${maxPages}` })
          .setTimestamp();

        return msg.channel.send({ embeds: [roleEmbed] });
      }

      default:
        return msg.channel.send('Invalid action. Use `add`, `remove`, or `list`.');
    }
  }
}

module.exports = AutoRole;
