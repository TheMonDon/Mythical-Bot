const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder().setName('ping').setDescription('Check the ping of the bot');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const reply = await interaction.editReply('Loading data...');

  const embed = new EmbedBuilder().setTitle('Ping').addFields([
    {
      name: 'Bot Latency',
      value: `${reply.createdTimestamp - interaction.createdTimestamp}ms`,
      inline: true,
    },
    {
      name: 'API Latency',
      value: `${Math.round(interaction.client.ws.ping)}ms`,
      inline: true,
    },
  ]);
  return interaction.editReply({ content: '', embeds: [embed] });
};
