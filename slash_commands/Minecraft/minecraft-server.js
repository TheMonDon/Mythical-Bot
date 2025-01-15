/* eslint-disable prefer-regex-literals */
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-superfetch');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('minecraft-server')
  .setDescription('Get information about a Minecraft server')
  .addStringOption((option) =>
    option.setName('username').setDescription('The username of the Minecraft account').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  let query = interaction.options.getString('server');

  const servers = {
    'crafters-island': 'mc.crafters-island.com',
    hypixel: 'mc.hypixel.net',
    mineplex: 'us.mineplex.com',
    '2b2t': '2b2t.org',
    mcprison: 'mcprison.com',
    purpleprison: 'purpleprison.net',
  };

  query = servers[query.toString()] ? servers[query.toString()] : query;

  const { body } = await fetch.get(`https://api.mcsrvstat.us/2/${encodeURI(query)}`).catch(() => {
    return interaction.editReply('Sorry, either that is not a valid IP or that server is offline.');
  });

  if (!body.online) return interaction.editReply('Sorry, either that is not a valid IP or that server is offline.');

  const em = new EmbedBuilder()
    .setTitle('Minecraft Server Stats')
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .addFields([
      {
        name: 'IP Address:',
        value:
          `${body.hostname.toString() || body.ip.toString() + (body.port !== '25565' ? `:${body.port}` : '')}` || 'N/A',
        inline: false,
      },
      { name: 'Version:', value: body.version.toString() || 'N/A', inline: false },
      { name: 'Players:', value: `${body.players.online}/${body.players.max}` || 'N/A', inline: false },
      { name: 'MOTD:', value: body.motd.clean.toString() || 'N/A', inline: false },
    ]);
  return interaction.editReply({ embeds: [em] });
};
