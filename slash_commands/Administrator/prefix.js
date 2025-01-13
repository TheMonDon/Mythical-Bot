const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('prefix')
  .setContexts(InteractionContextType.Guild)
  .setDescription('View or set the prefix for the guild')
  .addStringOption((option) =>
    option.setName('prefix').setDescription('Set the new prefix for the guild').setMaxLength(15),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const newPrefix = interaction.options.getString('prefix');

  if (!newPrefix) {
    return interaction.editReply(`The current prefix is: \`${interaction.settings.prefix}\``);
  }

  if (newPrefix === interaction.settings.prefix) {
    return interaction.editReply(`The prefix is already set to \`${interaction.settings.prefix}\``);
  }

  this.client.settings.set(interaction.guild.id, newPrefix, 'prefix');
  return interaction.editReply(`The prefix has been changed to: \`${newPrefix}\``);
};
