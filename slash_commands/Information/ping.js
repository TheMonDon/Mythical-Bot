const { SlashCommandBuilder } = require('discord.js');

exports.conf = {
  permLevel: 'User',
  guildOnly: false,
};

exports.commandData = new SlashCommandBuilder().setName('ping').setDescription('Check the ping of the bot');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const reply = await interaction.editReply('Ping?');
  await interaction.editReply(
    `Pong! Latency is ${reply.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(
      interaction.client.ws.ping,
    )}ms.`,
  );
};
