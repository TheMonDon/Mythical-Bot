const { SlashCommandBuilder } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder().setName('ping').setDescription('Check the ping of the bot');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const reply = await interaction.editReply('Loading data...');
  await interaction.editReply(
    `🏓 Bot Latency is ${reply.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(
      interaction.client.ws.ping,
    )}ms.`,
  );
};
