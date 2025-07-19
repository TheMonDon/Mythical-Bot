const { SlashCommandBuilder, InteractionContextType, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('auto-role')
  .setDescription('Manage auto-roles in the server')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a role to the auto-role list')
      .addRoleOption((option) => option.setName('role').setDescription('The role to add').setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove')
      .setDescription('Remove a role from the auto-role list')
      .addRoleOption((option) => option.setName('role').setDescription('The role to remove').setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('list')
      .setDescription('List all auto-roles in the server')
      .addIntegerOption((option) => option.setName('page').setDescription('The page number to view')),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const type = interaction.options.getSubcommand();
  const role = interaction.options.getRole('role');
  let page = interaction.options.getInteger('page') || 1;

  if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
    return interaction.client.util.errorEmbed(
      interaction,
      'Manage Roles permission is required on the bot to use this.',
      'Missing Permission',
    );
  }

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

  switch (type) {
    case 'add': {
      const autoRoles = (await db.get(`servers.${interaction.guild.id}.autoRoles`)) || [];
      if (autoRoles.includes(role.id)) {
        embed.setDescription('This role is already set as an auto-role.');
        return interaction.editReply({ embeds: [embed] });
      }

      autoRoles.push(role.id);
      await db.set(`servers.${interaction.guild.id}.autoRoles`, autoRoles);

      embed.setDescription(`The ${role} role will be given to all new members when they join the server.`);
      return interaction.editReply({ embeds: [embed] });
    }

    case 'remove': {
      let autoRoles = (await db.get(`servers.${interaction.guild.id}.autoRoles`)) || [];
      if (!autoRoles.includes(role.id)) {
        embed
          .setDescription(`The ${role} role is not as as an auto-role.`)
          .setColor(interaction.settings.embedErrorColor);
        return interaction.editReply({ embeds: [embed] });
      }

      autoRoles = autoRoles.filter((r) => r !== role.id);
      await db.set(`servers.${interaction.guild.id}.autoRoles`, autoRoles);

      embed.setDescription(`The ${role} role will no longer be given to new members when they join the server.`);
      return interaction.editReply({ embeds: [embed] });
    }

    case 'list': {
      const autoRoles = (await db.get(`servers.${interaction.guild.id}.autoRoles`)) || [];

      // Fetch all roles to ensure uncached roles are included
      const allRoles = await interaction.guild.roles.fetch();

      // Remove roles that are no longer in the server
      const validRoles = autoRoles.filter((roleId) => allRoles.has(roleId));

      // Update the database if roles were removed
      if (validRoles.length !== autoRoles.length) {
        await db.set(`servers.${interaction.guild.id}.autoRoles`, validRoles);
      }

      // If no valid roles remain, send an appropriate message
      if (validRoles.length === 0) {
        embed
          .setDescription('No valid auto-roles remain in the server. The list has been updated.')
          .setColor(interaction.settings.embedErrorColor);
        return interaction.editReply({ embeds: [embed] });
      }

      const itemsPerPage = 10;
      const maxPages = Math.ceil(validRoles.length / itemsPerPage);

      if (page > maxPages) page = maxPages;
      if (page < 1) page = 1;

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const roles = validRoles.slice(start, end).map((roleId) => {
        const role = allRoles.get(roleId);
        return role ? role.name : `Unknown Role (${roleId})`;
      });

      const roleEmbed = new EmbedBuilder()
        .setTitle('Auto-Roles')
        .addFields(roles.map((role, index) => ({ name: `${start + index + 1}.`, value: role })))
        .setColor(interaction.settings.embedColor)
        .setFooter({ text: `Page ${page} / ${maxPages}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [roleEmbed] });
    }
  }
};
