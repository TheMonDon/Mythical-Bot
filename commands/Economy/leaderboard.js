const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Leaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      description: 'Get the economy leaderboard',
      category: 'Economy',
      examples: ['leaderboard 2', 'leaderboard -bank', 'leaderboard 2 -cash'],
      aliases: ['lb', 'baltop'],
      usage: 'leaderboard [page] [-cash | -bank]',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    const [economyRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          guild_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';
    const startingBalance = economyRows[0]?.start_balance || 0;
    connection.release();

    let page = Math.max(parseInt(args[0]) || 1, 1);
    const cashOrBank = args.includes('-cash') ? 'cash' : args.includes('-bank') ? 'bank' : 'total';
    /*
    const usersCount = (await db.get(`servers.${msg.guild.id}.users`))
      ? Object.keys(await db.get(`servers.${msg.guild.id}.users`)).length
      : 0;
    */
    const usersCount = Object.keys((await db.get(`servers.${msg.guild.id}.users`)) || {}).length;
    const itemsPerPage = 10;
    const maxPages = Math.ceil(usersCount / itemsPerPage);

    if (page > maxPages) page = maxPages;

    // Fetch data for the current page
    const offset = (page - 1) * itemsPerPage;
    await msg.guild.members.fetch();
    const usersData = (await db.get(`servers.${msg.guild.id}.users`)) || {};

    const sortedLeaderboard = Object.entries(usersData)
      .map(([userId, data]) => {
        const cash = BigInt(data.economy?.cash || startingBalance);
        const bank = BigInt(data.economy?.bank || 0);
        const total = cash + bank;

        const money = cashOrBank === 'cash' ? cash : cashOrBank === 'bank' ? bank : total;

        return { userId, money };
      })
      .sort((a, b) => (b.money > a.money ? 1 : b.money < a.money ? -1 : 0))
      .slice(offset, offset + itemsPerPage); // Pagination happens here

    function getOrdinalSuffix(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    const fullLeaderboard = Object.entries(usersData)
      .map(([userId, data]) => {
        const cash = BigInt(data.economy?.cash || startingBalance);
        const bank = BigInt(data.economy?.bank || 0);
        const total = cash + bank;

        return { userId, money: cashOrBank === 'cash' ? cash : cashOrBank === 'bank' ? bank : total };
      })
      .sort((a, b) => (b.money > a.money ? 1 : b.money < a.money ? -1 : 0)); // Sort before slicing

    // Assign ranks to the entire leaderboard
    fullLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get the user's rank from the full leaderboard
    const userRank = fullLeaderboard.find((entry) => entry.userId === msg.author.id);
    const userRankDisplay = userRank
      ? `Your leaderboard rank: ${getOrdinalSuffix(userRank.rank)}`
      : 'You are not on the leaderboard';

    // Create embed content
    const description =
      (
        await Promise.all(
          sortedLeaderboard.map(async (entry, index) => {
            const user = this.client.users.cache.get(entry.userId) ||
              (await this.client.users.fetch(entry.userId).catch(() => null)) || { tag: 'Unknown User' };

            const neg = entry.money < 0n;
            const money = neg ? -entry.money : entry.money;

            return `**${offset + index + 1}.** ${user.tag}: ${
              entry.money < 0n ? '-' : ''
            }${currencySymbol}${this.client.util.limitStringLength(money.toLocaleString(), 0, 150)}`;
          }),
        )
      ).join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(
        `${msg.guild.name} ${cashOrBank === 'cash' ? 'Cash' : cashOrBank === 'bank' ? 'Bank' : 'Total'} Leaderboard`,
      )
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription(description)
      .setFooter({ text: `Page ${page} / ${maxPages} • ${userRankDisplay}` })
      .setTimestamp();

    // Create pagination buttons
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

    // Send the embed
    const message = await msg.channel.send({ embeds: [embed], components: [row] });

    // Button interaction handling
    const collector = message.createMessageComponentCollector({ time: 3600000 });
    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      // Calculate the offset and slice the leaderboard for the current page
      const offset = (page - 1) * itemsPerPage; // itemsPerPage is the number of users per page (e.g., 10)
      const currentPageLeaderboard = fullLeaderboard.slice(offset, offset + itemsPerPage);

      // Fetch user data for the current page asynchronously
      const displayedLeaderboard = await Promise.all(
        currentPageLeaderboard.map(async (entry, index) => {
          const user =
            this.client.users.cache.get(entry.userId) ||
            (await this.client.users.fetch(entry.userId).catch(() => null));
          const formattedMoney = this.client.util.limitStringLength(entry.money.toLocaleString(), 0, 150);
          return user
            ? `**${offset + index + 1}.** ${user.tag}: ${currencySymbol}${formattedMoney}`
            : `**${offset + index + 1}.** Unknown User: ${currencySymbol}${formattedMoney}`;
        }),
      );

      // Update the embed
      const updatedEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} Leaderboard`)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setDescription(displayedLeaderboard.join('\n') || 'None')
        .setFooter({ text: `Page ${page} / ${maxPages} • ${userRankDisplay}` })
        .setTimestamp();

      // Update the row (buttons)
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

      // Update the interaction response
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
