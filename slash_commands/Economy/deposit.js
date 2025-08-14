const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('deposit')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Check your balance')
  .addIntegerOption((option) =>
    option.setName('amount').setDescription('The amount of money to deposit').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();

  const [economyRows] = await connection.execute(
    /* sql */ `
      SELECT
        *
      FROM
        economy_settings
      WHERE
        guild_id = ?
    `,
    [interaction.guild.id],
  );
  const currencySymbol = economyRows[0]?.symbol || '$';
  connection.release();

  const amount = BigInt(interaction.options.getInteger('amount'));

  const cash = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`)) ||
      economyRows[0]?.start_balance ||
      0,
  );

  const bank = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.bank`)) || 0,
  );

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

  let csCashAmount = currencySymbol + cash.toLocaleString();
  csCashAmount = interaction.client.util.limitStringLength(csCashAmount, 0, 1024);

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
  csAmount = interaction.client.util.limitStringLength(csAmount, 0, 1024);

  embed.setDescription(`Deposited ${csAmount} to your bank.`);

  return interaction.editReply({ embeds: [embed] });
};
