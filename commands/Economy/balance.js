const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Balance extends Command {
  constructor(client) {
    super(client, {
      name: 'balance',
      category: 'Economy',
      description: 'Get yours or another members balance',
      usage: 'balance [member]',
      aliases: ['bal', 'money'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem = msg.author;

    if (args && args.length > 0) {
      mem = await this.client.util.getMember(msg, args.join(' '));

      if (!mem) {
        const fid = args.join(' ').replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(fid);
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid User');
        }
      }
      mem = mem.user ? mem.user : mem;
    }

    const embed = new EmbedBuilder().setAuthor({
      name: msg.member.displayName,
      iconURL: msg.member.displayAvatarURL(),
    });

    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');

    const cashValue = await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.cash`);
    const startBalance = BigInt((await db.get(`servers.${msg.guild.id}.economy.startBalance`)) || 0);
    const cash = cashValue === undefined ? startBalance : BigInt(cashValue);

    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.bank`)) || 0);
    const netWorth = cash + bank;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

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
    csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

    let csBankAmount = formatCurrency(bank, currencySymbol);
    csBankAmount = this.client.util.limitStringLength(csBankAmount, 0, 1024);

    let csNetWorthAmount = formatCurrency(netWorth, currencySymbol);
    csNetWorthAmount = this.client.util.limitStringLength(csNetWorthAmount, 0, 1024);

    // Fetch all users data to find the rank
    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const leaderboard = [];

    // Cache users and add them to the leaderboard
    for (const userId in usersData) {
      try {
        const user = await this.client.users.cache.get(userId);
        if (user) {
          const userCash = BigInt(usersData[userId]?.economy?.cash || 0);
          const userBank = BigInt(usersData[userId]?.economy?.bank || 0);
          const userMoney = userCash + userBank;
          leaderboard.push({ user: user.tag, userId: user.id, money: userMoney });
        }
      } catch (err) {
        this.client.logger.error(`Balance Leaderboard: ${err}`);
      }
    }

    // Sort the leaderboard
    const sortedLeaderboard = leaderboard.sort((a, b) => (b.money > a.money ? 1 : -1));

    // Find the user's rank
    const userRank = sortedLeaderboard.findIndex((entry) => entry.userId === mem.id) + 1;
    const userRankDisplay = userRank > 0 ? `Leaderboard Rank: ${getOrdinalSuffix(userRank)}` : 'Not on Leaderboard';

    embed
      .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setDescription(userRankDisplay)
      .addFields([
        { name: 'Cash:', value: csCashAmount },
        { name: 'Bank:', value: csBankAmount },
        { name: 'Net Worth:', value: csNetWorthAmount },
      ])
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Balance;
