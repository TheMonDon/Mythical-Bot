const Command = require('../../base/Command.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

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
    // 1. Fetch Server Settings
    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          symbol
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';

    // 2. Setup Pagination and Filters
    let page = Math.max(parseInt(args[0]) || 1, 1);
    const cashOrBank = args.includes('-cash') ? 'cash' : args.includes('-bank') ? 'bank' : 'total';
    const orderColumn = cashOrBank === 'cash' ? 'cash' : cashOrBank === 'bank' ? 'bank' : '(cash + bank)';
    const itemsPerPage = 10;

    // 3. Get Total User Count for Max Pages
    const [countRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          COUNT(*) AS count
        FROM
          economy_balances
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const usersCount = countRows[0].count;
    const maxPages = Math.ceil(usersCount / itemsPerPage) || 1;
    if (page > maxPages) page = maxPages;

    // 4. Helper function to generate the Rank string for the footer
    const getRankDisplay = async () => {
      const [rankRows] = await this.client.db.execute(
        /* sql */
        `SELECT rank FROM (
          SELECT user_id, RANK() OVER (ORDER BY ${orderColumn} DESC) AS \`rank\`
          FROM economy_balances WHERE server_id = ?
        ) ranked WHERE user_id = ?`,
        [msg.guild.id, msg.author.id],
      );

      const userRank = rankRows[0]?.rank;
      if (!userRank) return 'You are not on the leaderboard';

      const s = ['th', 'st', 'nd', 'rd'];
      const v = userRank % 100;
      const ordinal = userRank + (s[(v - 20) % 10] || s[v] || s[0]);
      return `Your leaderboard rank: ${ordinal}`;
    };

    // 5. Helper function to fetch a specific page and build the embed
    const generateEmbed = async (currentPage) => {
      const offset = (currentPage - 1) * itemsPerPage;
      const [rows] = await this.client.db.execute(
        /* sql */
        `
          SELECT
            user_id,
            cash,
            bank
          FROM
            economy_balances
          WHERE
            server_id = ?
          ORDER BY
            ${orderColumn} DESC
          LIMIT
            ?
          OFFSET
            ?
        `,
        [msg.guild.id, itemsPerPage, offset],
      );

      const leaderboardLines = await Promise.all(
        rows.map(async (row, index) => {
          const user = this.client.users.cache.get(row.user_id) ||
            (await this.client.users.fetch(row.user_id).catch(() => null)) || { tag: 'Unknown User' };

          const cash = BigInt(row.cash || 0);
          const bank = BigInt(row.bank || 0);
          const money = cashOrBank === 'cash' ? cash : cashOrBank === 'bank' ? bank : cash + bank;

          const isNeg = money < 0n;
          const absMoney = isNeg ? -money : money;
          const formatted = this.client.util.limitStringLength(absMoney.toLocaleString(), 0, 150);

          return `**${offset + index + 1}.** ${user.tag}: ${isNeg ? '-' : ''}${currencySymbol}${formatted}`;
        }),
      );

      const userRankDisplay = await getRankDisplay();

      return new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(`${msg.guild.name} ${cashOrBank.charAt(0).toUpperCase() + cashOrBank.slice(1)} Leaderboard`)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setDescription(leaderboardLines.join('\n') || 'No users found.')
        .setFooter({ text: `Page ${currentPage} / ${maxPages} • ${userRankDisplay}` })
        .setTimestamp();
    };

    // 6. Initial Send
    const embed = await generateEmbed(page);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === maxPages),
    );

    const message = await msg.channel.send({ embeds: [embed], components: [row] });

    // 7. Collector logic
    const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minutes

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.customId === 'prev') page--;
      if (interaction.customId === 'next') page++;

      const newEmbed = await generateEmbed(page);
      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === maxPages),
      );

      await interaction.update({ embeds: [newEmbed], components: [newRow] });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
      );
      message.edit({ components: [disabledRow] }).catch(() => null);
    });
  }
}

module.exports = Leaderboard;
