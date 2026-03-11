const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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

    if (!mem) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    } else if (mem.bot) {
      return this.client.util.errorEmbed(msg, 'Bots do not have a balance.', 'Invalid Member');
    }

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );

    const [balanceRows] = await this.client.db.execute(
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
      [msg.guild.id, mem.id],
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
    csCashAmount = this.client.util.limitStringLength(csCashAmount, 0, 1024);

    let csBankAmount = formatCurrency(bank, currencySymbol);
    csBankAmount = this.client.util.limitStringLength(csBankAmount, 0, 1024);

    let csNetWorthAmount = formatCurrency(netWorth, currencySymbol);
    csNetWorthAmount = this.client.util.limitStringLength(csNetWorthAmount, 0, 1024);

    const [rows] = await this.client.db.execute(
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
      [msg.guild.id, mem.id],
    );

    const userRank = rows[0]?.rank ?? null;
    const userRankDisplay = userRank ? `Leaderboard Rank: ${getOrdinalSuffix(userRank)}` : 'Not on Leaderboard';

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
