const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('balance')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Check your balance')
  .addUserOption((option) => option.setName('user').setDescription('Check the balance of another user'));

exports.run = async (interaction) => {
  await interaction.deferReply();

  let mem = interaction.options?.get('user')?.member || interaction.options?.get('user')?.user;
  if (!mem) mem = interaction.user;

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

  const [balanceRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        cash,
        bank
      FROM
        economy_balances
      WHERE
        server_id = ?
        AND user_id = ?
    `,
    [interaction.guild.id, mem.id],
  );
  const cash = BigInt(balanceRows[0]?.cash ?? economyRows[0]?.start_balance ?? 0);
  const bank = BigInt(balanceRows[0]?.bank ?? 0);
  const netWorth = cash + bank;

  const currencySymbol = economyRows[0]?.symbol || '$';

  function formatCurrency(amount, symbol) {
    if (amount < 0) {
      return '-' + symbol + (-amount).toLocaleString();
    }
    return symbol + amount.toLocaleString();
  }

  function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  let csCashAmount = formatCurrency(cash, currencySymbol);
  csCashAmount = interaction.client.util.limitStringLength(csCashAmount, 0, 1024);

  let csBankAmount = formatCurrency(bank, currencySymbol);
  csBankAmount = interaction.client.util.limitStringLength(csBankAmount, 0, 1024);

  let csNetWorthAmount = formatCurrency(netWorth, currencySymbol);
  csNetWorthAmount = interaction.client.util.limitStringLength(csNetWorthAmount, 0, 1024);

  const [rows] = await interaction.client.db.execute(
    /* sql */
    `
      SELECT
        rank
      FROM
        (
          SELECT
            user_id,
            RANK() OVER (
              ORDER BY
                (cash + bank) DESC
            ) AS rank
          FROM
            economy_balances
          WHERE
            server_id = ?
        ) ranked
      WHERE
        user_id = ?
    `,
    [interaction.guild.id, mem.id],
  );

  const userRank = rows[0]?.rank ?? null;
  const userRankDisplay = userRank ? `Leaderboard Rank: ${getOrdinalSuffix(userRank)}` : 'Not on Leaderboard';

  const embed = new EmbedBuilder()
    .setAuthor({ name: mem.user?.tag || mem.username, iconURL: mem.user?.displayAvatarURL() || mem.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setDescription(userRankDisplay)
    .addFields([
      { name: 'Cash:', value: csCashAmount },
      { name: 'Bank:', value: csBankAmount },
      { name: 'Net Worth:', value: csNetWorthAmount },
    ])
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
};
