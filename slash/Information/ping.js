// Set guildOnly to true if you want it to be available on guilds only.
// Otherwise false is global.
exports.conf = {
  permLevel: 'User',
  guildOnly: false
};

exports.commandData = {
  name: 'ping',
  description: 'Pongs when pinged.',
  options: [],
  dmPermission: true
};

exports.run = async (client, interaction) => {
  await interaction.deferReply();
  const reply = await interaction.editReply('Ping?');
  await interaction.editReply(`Pong! Latency is ${reply.createdTimestamp - interaction.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms.`);
};
