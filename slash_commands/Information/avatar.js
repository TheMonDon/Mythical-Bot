const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Get a users avatar')
  .addUserOption((option) => option.setName('user').setDescription('The user to get the avatar of').setRequired(false));

exports.run = async (interaction) => {
  await interaction.deferReply();
  let infoMem = interaction.user;
  if (interaction.options.getUser('user')) {
    infoMem = interaction.options.getUser('user');
  }

  infoMem = infoMem.user ? infoMem.user : infoMem;
  const embed = new EmbedBuilder()
    .setTitle(`${infoMem.username}'s Avatar`)
    .setColor(interaction.settings.embedColor)
    .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
    .setImage(infoMem.displayAvatarURL({ size: 4096, extension: 'png' }));

  return interaction.editReply({ embeds: [embed] });
};
