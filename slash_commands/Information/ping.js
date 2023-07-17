exports.conf = {
  permLevel: 'User',
  guildOnly: false,
};

exports.commandData = {
  name: 'ping',
  description: 'Pongs when pinged.',
  options: [],
  dmPermission: true,
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const reply = await interaction.editReply('Ping?');
  await interaction.editReply(
    `Pong! Latency is ${reply.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(
      interaction.client.ws.ping,
    )}ms.`,
  );
};
