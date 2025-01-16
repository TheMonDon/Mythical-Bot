const { EmbedBuilder, SlashCommandBuilder, version } = require('discord.js');
const { version: botVersion } = require('../../package.json');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder().setName('bot-info').setDescription('View information about the bot');

exports.run = async (interaction) => {
  await interaction.deferReply();
  await interaction.client.guilds.cache.forEach((g) => g.available && g.members.fetch());
  const botUptime = moment
    .duration(interaction.client.uptime)
    .format('y[ years][,] M[ months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

  const commands = await db.get('global.commands');
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
      { name: 'Commands Used', value: commands.toLocaleString(), inline: true },
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
