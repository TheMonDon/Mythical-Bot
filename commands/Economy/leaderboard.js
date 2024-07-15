const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Leaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      description: 'Get the economy leaderboard',
      category: 'Economy',
      examples: ['leaderboard [page]'],
      aliases: ['lb', 'baltop'],
      usage: 'leaderboard [page]',
      guildOnly: true,
    });
  }

  async run(msg, text) {
    let page = text.join(' ');
    page = parseInt(page, 10);

    // Leaderboard made possible by: legendarylegacy (CoolGuy#9889)

    if (!page) page = 1;
    if (isNaN(page)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    await msg.guild.members.fetch();
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    let realPage = page;
    let maxPages = page;
    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const leaderboard = [];

    // Cache users and add them to the leaderboard
    for (const userId in usersData) {
      try {
        const user = await this.client.users.cache.get(userId);
        if (user) {
          const cash = BigInt(usersData[userId].economy.cash || 0);
          const bank = BigInt(usersData[userId].economy.bank || 0);
          const money = cash + bank;
          leaderboard.push({ user: user.tag, userId: user.id, money });
        }
      } catch (err) {
        this.client.logger.error(`Leaderboard: ${err}`);
      }
    }

    // Sort the leaderboard
    const sortedLeaderboard = leaderboard
      .sort((a, b) => (BigInt(b.money) > BigInt(a.money) ? 1 : -1))
      .map((c, index) => {
        const neg = BigInt(c.money) < 0n;
        const money = neg ? BigInt(c.money) * -1n : BigInt(c.money);
        return {
          rank: index + 1,
          user: c.user,
          userId: c.userId,
          display: `**${index + 1}.** ${c.user}: ${neg ? '-' : ''}${currencySymbol}${
            money.toLocaleString().length > 156
              ? `${money.toLocaleString().slice(0, 153) + '...'}`
              : `${money.toLocaleString()}`
          }`,
        };
      });

    function getOrdinalSuffix(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    // Find the user's rank
    const userRank = sortedLeaderboard.find((entry) => entry.userId === msg.author.id);
    const userRankDisplay = userRank
      ? `Your leaderboard rank: ${getOrdinalSuffix(userRank.rank)}`
      : 'You are not on the leaderboard';

    let displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);

    // Create the pages
    if (displayedLeaderboard.length > 0) {
      realPage = page;
      maxPages = Math.ceil((sortedLeaderboard.length + 1) / 10);
      displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);
    } else {
      for (let i = 1; i <= page; i++) {
        displayedLeaderboard = sortedLeaderboard.slice((i - 1) * 10, i * 10);
        if (displayedLeaderboard?.length < 1) {
          realPage = i - 1;
          maxPages = Math.ceil(sortedLeaderboard.length / 10);
          displayedLeaderboard = sortedLeaderboard.slice((i - 2) * 10, (i - 1) * 10);
          break;
        }
      }
    }

    // Send the leaderboard
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Leaderboard`)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`${displayedLeaderboard.map((entry) => entry.display).join('\n') || 'None'}`)
      .setFooter({ text: `Page ${realPage} / ${maxPages} • ${userRankDisplay}` })
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Leaderboard;
