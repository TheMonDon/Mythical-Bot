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
          leaderboard.push({ user: user.tag, money });
        }
      } catch (err) {
        this.client.logger.error(`Leaderboard: ${err}`);
      }
    }

    // Sort the leaderboard
    const sortedLeaderboard = leaderboard
      .sort((a, b) => (BigInt(b.money) > BigInt(a.money) ? 1 : -1))
      .map((c) => {
        const neg = BigInt(c.money) < 0n;
        const money = neg ? BigInt(c.money) * -1n : BigInt(c.money);
        return `**${leaderboard.indexOf(c) + 1}.** ${c.user}: ${neg ? '-' : ''}${currencySymbol}${
          money.toLocaleString().length > 156
            ? `${money.toLocaleString().slice(0, 153) + '...'}`
            : `${money.toLocaleString()}`
        }`;
      });

    let displayedLeaderboard = sortedLeaderboard.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));

    // Create the pages
    if (displayedLeaderboard.length > 0) {
      realPage = page;
      maxPages = Math.ceil((sortedLeaderboard.length + 1) / 10);
      displayedLeaderboard = sortedLeaderboard.slice(Math.floor((page - 1) * 10), Math.ceil(page * 10));
    } else {
      for (let i = 1; i <= page; i++) {
        displayedLeaderboard = sortedLeaderboard.slice(Math.floor((i - 1) * 10), Math.ceil(i * 10));
        if (displayedLeaderboard?.length < 1) {
          realPage = i - 1;
          maxPages = Math.ceil(sortedLeaderboard.length / 10);
          displayedLeaderboard = sortedLeaderboard.slice(Math.floor((i - 1 - 1) * 10), Math.ceil((i - 1) * 10));
          break;
        }
      }
    }

    // Send the leaderboard
    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Leaderboard`)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setDescription(displayedLeaderboard.join('\n') || 'None')
      .setFooter({ text: `Page ${realPage} / ${maxPages}` })
      .setTimestamp();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Leaderboard;
