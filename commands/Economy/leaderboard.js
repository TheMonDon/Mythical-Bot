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
      examples: ['leaderboard [page]'],
      aliases: ['lb', 'baltop'],
      usage: 'leaderboard [page]',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let page = parseInt(args.join(' '), 10) || 1;

    if (isNaN(page)) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');

    await msg.guild.members.fetch();
    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';
    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const leaderboard = [];

    for (const userId in usersData) {
      try {
        const user = await this.client.users.cache.get(userId);
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

    const sortedLeaderboard = leaderboard
      .sort((a, b) => (b.money > a.money ? 1 : -1))
      .map((c, index) => {
        const bigMoney = BigInt(c.money);
        const money = bigMoney < 0n ? -bigMoney : bigMoney;
        let moneyStr = `${money.toLocaleString()}`;
        if (moneyStr.length > 150) {
          moneyStr = moneyStr.slice(0, 147) + '...';
        }
        return {
          rank: index + 1,
          user: c.user,
          userId: c.userId,
          display: `**${index + 1}.** ${c.user}: ${c.money < 0n ? '-' : ''}${currencySymbol}${moneyStr}`,
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

    let displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);
    const maxPages = Math.ceil(sortedLeaderboard.length / 10);

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(`${msg.guild.name}'s Leaderboard`)
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
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
        .setTitle(`${msg.guild.name}'s Leaderboard`)
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
