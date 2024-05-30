const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('balance')
  .setDMPermission(false)
  .setDescription('Check your balance')
  .addUserOption((option) => option.setName('user').setDescription('Check the balance of another user'));

exports.run = async (interaction) => {
  await interaction.deferReply();
  let mem = interaction.options?.get('user')?.member || interaction.options?.get('user')?.user;
  if (!mem) mem = interaction.user;

  const cash = parseFloat(
    (await db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.cash`)) ||
      (await db.get(`servers.${interaction.guildId}.economy.startBalance`)) ||
      0,
  );
  const bank = parseFloat((await db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.bank`)) || 0);
  const netWorth = cash + bank;

  const currencySymbol = (await db.get(`servers.${interaction.guildId}.economy.symbol`)) || '$';

  const embed = new EmbedBuilder()
    .setAuthor({ name: mem.user?.tag || mem.username, iconURL: mem.user?.displayAvatarURL() || mem.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .addFields([
      { name: 'Cash:', value: currencySymbol + cash.toLocaleString() },
      { name: 'Bank:', value: currencySymbol + bank.toLocaleString() },
      { name: 'Net Worth:', value: currencySymbol + netWorth.toLocaleString() },
    ])
    .setTimestamp();
  return interaction.editReply({ embeds: [embed] });
};
