const { SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
  guildOnly: true,
};

exports.commandData = new SlashCommandBuilder()
  .setName('persistent-roles')
  .setDescription('Enable/Disable Persistent-Roles')
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
  .setDMPermission(false);

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

  switch (type) {
    case 'enable': {
      await db.set(`servers.${interaction.guild.id}.proles.system`, true);
      return interaction.editReply('The persistent role system for this server has been enabled');
    }

    case 'disable': {
      await db.set(`servers.${interaction.guild.id}.proles.system`, false);
      return interaction.editReply('The persistent role system for this server has been disabled');
    }

    case 'information': {
      return interaction.editReply(
        'When persistent roles is enabled users who leave the guild will have their roles automatically returned when they come back.',
      );
    }
  }
};
