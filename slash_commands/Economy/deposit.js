const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('balance')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Check your balance')
  .addIntegerOption((option) =>
    option.setName('amount').setDescription('The amount of money to deposit').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  let amount = interaction.options.getInteger('amount');
  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  const cashValue = await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`);
  const startBalance = BigInt((await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) || 0);
  const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

  const bank = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.bank`)) || 0,
  );

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  let csCashAmount = currencySymbol + cash.toLocaleString();
  csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

  amount = amount.replace(/,/g, '').replace(currencySymbol, '');
  amount = BigInt(amount.replace(/[^0-9\\.]/g, ''));

  if (amount < BigInt(0))
    return interaction.client.util.errorEmbed(
      interaction,
      "You can't deposit negative amounts of cash",
      'Invalid Parameter',
    );
  if (amount > cash)
    return interaction.client.util.errorEmbed(
      interaction,
      `You don't have that much money to deposit. You currently have ${csCashAmount} in cash.`,
      'Invalid Parameter',
    );
  if (cash <= BigInt(0))
    return interaction.client.util.errorEmbed(interaction, "You don't have any cash to deposit", 'Invalid Parameter');

  const newCashAmount = cash - amount;
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newCashAmount.toString());
  const newBankAmount = bank + amount;
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.bank`, newBankAmount.toString());

  let csAmount = currencySymbol + amount.toLocaleString();
  csAmount = this.client.util.limitStringLength(csAmount, 0, 1024);
  embed.setDescription(`Deposited ${csAmount} to your bank.`);
  return interaction.editReply({ embeds: [embed] });
};
