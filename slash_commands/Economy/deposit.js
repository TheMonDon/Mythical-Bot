const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');

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

  const [economyRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        *
      FROM
        economy_settings
      WHERE
        server_id = ?
    `,
    [interaction.guild.id],
  );
  const currencySymbol = economyRows[0]?.symbol || '$';

  const amount = BigInt(interaction.options.getInteger('amount'));

  const [balanceRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        cash
      FROM
        economy_balances
      WHERE
        server_id = ?
        AND user_id = ?
    `,
    [interaction.guild.id, interaction.member.id],
  );
  const cash = BigInt(balanceRows[0]?.cash || economyRows[0]?.start_balance || 0);

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

  // Update cash balance
  await interaction.client.db.execute(
    /* sql */ `
      INSERT INTO
        economy_balances (server_id, user_id, cash)
      VALUES
        (?, ?, ?) ON DUPLICATE KEY
      UPDATE cash = cash -
      VALUES
        (cash)
    `,
    [interaction.guild.id, interaction.member.id, amount.toString()],
  );

  // Update bank balance
  await interaction.client.db.execute(
    /* sql */ `
      INSERT INTO
        economy_balances (server_id, user_id, bank)
      VALUES
        (?, ?, ?) ON DUPLICATE KEY
      UPDATE bank = bank +
      VALUES
        (bank)
    `,
    [interaction.guild.id, interaction.member.id, amount.toString()],
  );

  let csAmount = currencySymbol + amount.toLocaleString();
  csAmount = interaction.client.util.limitStringLength(csAmount, 0, 1024);

  embed.setDescription(`Deposited ${csAmount} to your bank.`);

  return interaction.editReply({ embeds: [embed] });
};
