const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Leaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      description: 'Get the economy leaderboard',
      category: 'Economy',
      examples: ['leaderboard [page] [-cash | -bank]'],
      aliases: ['lb', 'baltop'],
      usage: 'leaderboard [page]',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = parseInt(args[0]) || 1;
    let cashOrBank;
    if (isNaN(args[0])) {
      cashOrBank = args[0]?.toLowerCase();
    } else {
      cashOrBank = args[1]?.toLowerCase();
    }
    if (cashOrBank && !['-cash', '-bank'].includes(cashOrBank)) {
      return msg.reply('Invalid argument given');
    }
    if (isNaN(page)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    await msg.guild.members.fetch();
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const leaderboard = [];

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name} Leaderboard`)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() });

    if (!cashOrBank) {
      for (const userId in usersData) {
        try {
          const user = await this.client.users.fetch(userId);
          if (user) {
            const cash = BigInt(usersData[userId]?.economy?.cash || 0);
            const bank = BigInt(usersData[userId]?.economy?.bank || 0);
            const money = cash + bank;
            leaderboard.push({ user: user.tag, userId: user.id, money });
          }
        } catch (err) {
          this.client.logger.error(`Leaderboard: ${err}`);
        }
      }
    } else if (cashOrBank === '-cash') {
      embed.setTitle(`${msg.guild.name} Cash Leaderboard`);
      for (const userId in usersData) {
        try {
          const user = await this.client.users.fetch(userId);
          if (user) {
            const money = BigInt(usersData[userId]?.economy?.cash || 0);
            leaderboard.push({ user: user.tag, userId: user.id, money });
          }
        } catch (err) {
          this.client.logger.error(`Leaderboard: ${err}`);
        }
      }
    } else if (cashOrBank === '-bank') {
      embed.setTitle(`${msg.guild.name} Bank Leaderboard`);
      for (const userId in usersData) {
        try {
          const user = await this.client.users.fetch(userId);
          if (user) {
            const money = BigInt(usersData[userId]?.economy?.bank || 0);
            leaderboard.push({ user: user.tag, userId: user.id, money });
          }
        } catch (err) {
          this.client.logger.error(`Leaderboard: ${err}`);
        }
      }
    }

    const sortedLeaderboard = leaderboard
      .sort((a, b) => (b.money > a.money ? 1 : -1))
      .map((c, index) => {
        const bigMoney = BigInt(c.money);
        const neg = bigMoney < 0n;
        const money = neg ? -bigMoney : bigMoney;
        let moneyStr = `${money.toLocaleString()}`;
        if (moneyStr.length > 150) {
          moneyStr = moneyStr.slice(0, 147) + '...';
        }
        return {
          rank: index + 1,
          user: c.user,
          userId: c.userId,
          display: `**${index + 1}.** ${c.user}: ${bigMoney < 0n ? '-' : ''}${currencySymbol}${moneyStr}`,
        };
      });

    function getOrdinalSuffix(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    const userRank = sortedLeaderboard.find((entry) => entry.userId === msg.author.id);
    const userRankDisplay = userRank
      ? `Your leaderboard rank: ${getOrdinalSuffix(userRank.rank)}`
      : 'You are not on the leaderboard';

    const maxPages = Math.ceil(sortedLeaderboard.length / 10);
    // Ensure page is within valid range
    page = Math.max(1, Math.min(page, maxPages));
    let displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);

    embed
      .setDescription(`${displayedLeaderboard.map((entry) => entry.display).join('\n') || 'None'}`)
      .setFooter({ text: `Page ${page} / ${maxPages} • ${userRankDisplay}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === maxPages),
    );

    const message = await msg.channel.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({ time: 2147483647 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', ephemeral: true });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);

      const updatedEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} Leaderboard`)
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(`${displayedLeaderboard.map((entry) => entry.display).join('\n') || 'None'}`)
        .setFooter({ text: `Page ${page} / ${maxPages} • ${userRankDisplay}` })
        .setTimestamp();

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === maxPages),
      );

      await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
      );
      message.edit({ components: [disabledRow] });
    });
  }
}

module.exports = Leaderboard;
