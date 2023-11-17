const { SlashCommandBuilder } = require('discord.js');
const pornhub = require('@justalk/pornhub-api');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('pornhub')
  .setDescription('Search pornhub for a video')
  .setNSFW(true)
  .addStringOption((option) => option.setName('query').setDescription('Video to search for').setRequired(true));

exports.run = async (interaction) => {
  await interaction.deferReply();
  const query = interaction.options.getString('query');

  // Search pornhub by query and get the first result
  const results = await pornhub.search(query);
  const firstResult = results.results[0];

  return interaction.editReply(firstResult.link);
};
