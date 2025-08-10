const { EmbedBuilder, SlashCommandBuilder, version } = require('discord.js');
const { version: botVersion } = require('../../package.json');
const { stripIndents } = require('common-tags');
require('moment-duration-format');
const moment = require('moment');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder().setName('bot-info').setDescription('View information about the bot');

exports.run = async (interaction) => {
  await interaction.deferReply();
  await interaction.client.guilds.cache.forEach((g) => g.available && g.members.fetch());
  const botUptime = moment
    .duration(interaction.client.uptime)
    .format('y[ years][,] M[ months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');

  const connection = await interaction.client.db.getConnection();
  const [rows] = await connection.query(`SELECT * FROM globalruns`);
  connection.release();

  const totalCommands = rows[0]?.TOTAL_COMMANDS || 0;
  const totalText = rows[0]?.TEXT_RUNS || 0;
  const totalSlash = rows[0]?.SLASH_RUNS || 0;

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
    .setThumbnail(interaction.client.user.displayAvatarURL())
    .addFields([
      { name: 'Uptime', value: botUptime, inline: true },
      { name: 'Ping', value: Math.floor(interaction.client.ws.ping).toLocaleString(), inline: true },
      { name: 'Guilds', value: interaction.client.guilds.cache.size.toLocaleString(), inline: true },
      { name: 'Discord.js', value: version, inline: true },
      { name: 'Node', value: process.version, inline: true },
      {
        name: 'RAM Usage',
        value: `${Math.floor(process.memoryUsage().heapUsed / 1024 / 1024).toLocaleString()} MB`,
        inline: true,
      },
      { name: 'Bot Version', value: botVersion, inline: true },
      {
        name: 'Commands Used (Reset Aug 6, 2025)',
        value: `${totalCommands.toLocaleString()} (Text: ${totalText.toLocaleString()}, Slash: ${totalSlash.toLocaleString()})`,
        inline: true,
      },
      {
        name: 'Quick Bits',
        value: stripIndents`[Invite Link](https://cisn.xyz/mythical)
        [Source Code](https://github.com/TheMonDon/Mythical-Bot) 
        [Support Server](https://discord.com/invite/XvHzUNZDdR)
        [Website](https://mythical.cisn.xyz)`,
        inline: true,
      },
    ]);

  return interaction.editReply({ embeds: [embed] });
};
