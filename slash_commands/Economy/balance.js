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

  const cash = BigInt(
    parseInt(
      (await db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.cash`)) ||
        (await db.get(`servers.${interaction.guildId}.economy.startBalance`)) ||
        0,
      10,
    ),
  );
  const bank = BigInt(parseInt((await db.get(`servers.${interaction.guildId}.users.${mem.id}.economy.bank`)) || 0, 10));
  const netWorth = cash + bank;

  const currencySymbol = (await db.get(`servers.${interaction.guildId}.economy.symbol`)) || '$';

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
  csCashAmount = csCashAmount.length > 1024 ? `${csCashAmount.slice(0, 1021) + '...'}` : csCashAmount;

  let csBankAmount = formatCurrency(bank, currencySymbol);
  csBankAmount = csBankAmount.length > 1024 ? `${csBankAmount.slice(0, 1021) + '...'}` : csBankAmount;

  let csNetWorthAmount = formatCurrency(netWorth, currencySymbol);
  csNetWorthAmount = csNetWorthAmount.length > 1024 ? `${csNetWorthAmount.slice(0, 1021) + '...'}` : csNetWorthAmount;

  // Fetch all users data to find the rank
  const usersData = (await db.get(`servers.${interaction.guildId}.users`)) || {};
  const leaderboard = [];

  // Cache users and add them to the leaderboard
  for (const userId in usersData) {
    try {
      const user = await interaction.client.users.cache.get(userId);
      if (user) {
        const userCash = BigInt(parseInt(usersData[userId].economy.cash || 0, 10));
        const userBank = BigInt(parseInt(usersData[userId].economy.bank || 0, 10));
        const userMoney = userCash + userBank;
        leaderboard.push({ user: user.tag, userId: user.id, money: userMoney });
      }
    } catch (err) {
      console.error(`Leaderboard: ${err}`);
    }
  }

  // Sort the leaderboard
  const sortedLeaderboard = leaderboard.sort((a, b) => (b.money > a.money ? 1 : -1));

  // Find the user's rank
  const userRank = sortedLeaderboard.findIndex((entry) => entry.userId === mem.id) + 1;
  const userRankDisplay = userRank > 0 ? `Leaderboard Rank: ${getOrdinalSuffix(userRank)}` : 'Not on Leaderboard';

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
