const { SlashCommandBuilder, InteractionContextType, EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('persistent-roles')
  .setDescription('Control the persistent roles system for the server')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Enable/Disable or get information')
      .setRequired(true)
      .addChoices(
        { name: 'Enable', value: 'enable' },
        { name: 'Disable', value: 'disable' },
        { name: 'Information', value: 'information' },
      ),
  )
  .setContexts(InteractionContextType.Guild);

exports.run = async (interaction) => {
  await interaction.deferReply();
  const type = interaction.options.getString('type');

  if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
    return interaction.client.util.errorEmbed(
      interaction,
      'Manage Roles permission is required on the bot to use this.',
      'Missing Permission',
    );
  }

  const connection = await interaction.client.db.getConnection();
  const [toggleRows] = await connection.execute(
    /* sql */ `
      SELECT
        persistent_roles
      FROM
        server_settings
      WHERE
        server_id = ?
    `,
    [interaction.guild.id],
  );
  const toggle = toggleRows[0]?.persistent_roles === 1;

  switch (type) {
    case 'enable': {
      if (toggle) {
        connection.release();
        return interaction.editReply('The persistent role system for this server is already enabled');
      }

      await connection.execute(
        `
        INSERT INTO server_settings (server_id, persistent_roles)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE persistent_roles = VALUES(persistent_roles)`,
        [interaction.guild.id, true],
      );
      connection.release();

      return interaction.editReply('The persistent role system for this server has been enabled');
    }

    case 'disable': {
      if (!toggle) {
        connection.release();
        return interaction.editReply('The persistent role system for this server is already disabled');
      }

      await connection.execute(
        `
        INSERT INTO server_settings (server_id, persistent_roles)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE persistent_roles = VALUES(persistent_roles)`,
        [interaction.guild.id, false],
      );
      connection.release();

      return interaction.editReply('The persistent role system for this server has been disabled');
    }

    case 'information': {
      connection.release();

      const embed = new EmbedBuilder().setTitle('Persistent Roles System').setColor(interaction.settings.embedColor)
        .setDescription(stripIndents`The persistent roles system is currently **${toggle ? 'enabled' : 'disabled'}**.
          Use \`/persistent-roles [enable | disable]\` to change the status.
          
          When persistent roles is enabled users who leave the guild will have their roles automatically returned when they come back.
        `);

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
