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
      usage: 'auto-role <add | remove | list> [role or page]',
      aliases: ['autorole', 'autoroles'],
      permLevel: 'Administrator',
      examples: ['auto-role add @member', 'auto-role remove Moderator'],
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

    if (!msg.guild.members.me.permissions.has('ManageRoles')) {
      return this.client.util.errorEmbed(msg, 'The bot requires Manage Roles permission to use this feature.');
    }

    switch (action) {
      case 'add': {
        if (!roleName) return msg.channel.send('Please specify a role to add.');

        const role = this.client.util.getRole(msg, roleName.toLowerCase());
        if (!role) {
          return this.client.util.errorEmbed(msg, 'That role was not found.');
        }

        const autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];
        if (autoRoles.includes(role.id)) {
          return this.client.util.errorEmbed(msg, 'That role is already added as an auto-role.');
        }

        autoRoles.push(role.id);
        await db.set(`servers.${msg.guild.id}.autoRoles`, autoRoles);

        embed.setDescription(`The ${role} role will be given to all new members when they join the server.`);
        return msg.channel.send({ embeds: [embed] });
      }

      case 'remove': {
        if (!roleName) return msg.channel.send('Please specify a role to remove.');

        const role = this.client.util.getRole(msg, roleName.toLowerCase());
        if (!role) {
          return this.client.util.errorEmbed(msg, 'That role was not found.');
        }

        let autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];
        if (!autoRoles.includes(role.id)) {
          return this.client.util.errorEmbed(msg, `The \`${role}\` role is not as as an auto-role.`);
        }

        autoRoles = autoRoles.filter((r) => r !== role.id);
        await db.set(`servers.${msg.guild.id}.autoRoles`, autoRoles);

        embed.setDescription(`The ${role} role will no longer be given to new members when they join the server.`);
        return msg.channel.send({ embeds: [embed] });
      }

      case 'list': {
        const autoRoles = (await db.get(`servers.${msg.guild.id}.autoRoles`)) || [];

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

      default:
        return msg.channel.send('Invalid action. Use `add`, `remove`, or `list`.');
    }
  }
}

module.exports = AutoRole;
