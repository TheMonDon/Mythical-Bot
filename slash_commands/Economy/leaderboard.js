const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Get the economy leaderboard')
  .addIntegerOption((option) =>
    option.setName('page').setDescription('Specify the leaderboard page').setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Show only cash, bank, or total balances')
      .addChoices({ name: 'Total', value: 'total' }, { name: 'Bank', value: 'bank' }, { name: 'Cash', value: 'cash' }),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  // 1. Get Options & Settings
  let page = Math.max(interaction.options.getInteger('page') || 1, 1);
  const cashOrBank = interaction.options.getString('type') || 'total';
  const orderColumn = cashOrBank === 'cash' ? 'cash' : cashOrBank === 'bank' ? 'bank' : '(cash + bank)';
  const itemsPerPage = 10;

  const [economyRows] = await interaction.client.db.execute(`SELECT symbol FROM economy_settings WHERE server_id = ?`, [
    interaction.guild.id,
  ]);
  const currencySymbol = economyRows[0]?.symbol || '$';

  // 2. Get Max Pages
  const [countRows] = await interaction.client.db.execute(
    `SELECT COUNT(*) AS count FROM economy_balances WHERE server_id = ?`,
    [interaction.guild.id],
  );
  const usersCount = countRows[0].count;
  const maxPages = Math.ceil(usersCount / itemsPerPage) || 1;
  if (page > maxPages) page = maxPages;

  // 3. Helper: Get User's Personal Rank
  const getRankDisplay = async () => {
    const [rankRows] = await interaction.client.db.execute(
      `SELECT \`rank\` FROM (
        SELECT user_id, RANK() OVER (ORDER BY ${orderColumn} DESC) AS \`rank\`
        FROM economy_balances WHERE server_id = ?
      ) ranked WHERE user_id = ?`,
      [interaction.guild.id, interaction.user.id],
    );

    const userRank = rankRows[0]?.rank;
    if (!userRank) return 'You are not on the leaderboard';

    const s = ['th', 'st', 'nd', 'rd'];
    const v = userRank % 100;
    const ordinal = userRank + (s[(v - 20) % 10] || s[v] || s[0]);
    return `Your leaderboard rank: ${ordinal}`;
  };

  // 4. Helper: Generate the Embed content
  const generateEmbed = async (currentPage) => {
    const offset = (currentPage - 1) * itemsPerPage;
    const [rows] = await interaction.client.db.execute(
      `SELECT user_id, cash, bank FROM economy_balances 
       WHERE server_id = ? ORDER BY ${orderColumn} DESC LIMIT ? OFFSET ?`,
      [interaction.guild.id, itemsPerPage, offset],
    );

    const leaderboardLines = await Promise.all(
      rows.map(async (row, index) => {
        const user = interaction.client.users.cache.get(row.user_id) ||
          (await interaction.client.users.fetch(row.user_id).catch(() => null)) || { tag: 'Unknown User' };

        const cash = BigInt(row.cash || 0);
        const bank = BigInt(row.bank || 0);
        const money = cashOrBank === 'cash' ? cash : cashOrBank === 'bank' ? bank : cash + bank;

        const isNeg = money < 0n;
        const absMoney = isNeg ? -money : money;
        const formatted = interaction.client.util.limitStringLength(absMoney.toLocaleString(), 0, 150);

        return `**${offset + index + 1}.** ${user.tag}: ${isNeg ? '-' : ''}${currencySymbol}${formatted}`;
      }),
    );

    const userRankDisplay = await getRankDisplay();

    return new EmbedBuilder()
      .setColor(interaction.settings.embedColor)
      .setTitle(`${interaction.guild.name} ${cashOrBank.charAt(0).toUpperCase() + cashOrBank.slice(1)} Leaderboard`)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(leaderboardLines.join('\n') || 'No users found.')
      .setFooter({ text: `Page ${currentPage} / ${maxPages} • ${userRankDisplay}` })
      .setTimestamp();
  };

  // 5. Initial Execution
  const embed = await generateEmbed(page);
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

  const message = await interaction.editReply({ embeds: [embed], components: [row] });

  // 6. Interaction Collector
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.user.id !== interaction.user.id) {
      return btnInteraction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
    }

    if (btnInteraction.customId === 'prev_page') page--;
    if (btnInteraction.customId === 'next_page') page++;

    const newEmbed = await generateEmbed(page);
    const newRow = new ActionRowBuilder().addComponents(
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

    await btnInteraction.update({ embeds: [newEmbed], components: [newRow] });
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
    );
    interaction.editReply({ components: [disabledRow] }).catch(() => null);
  });
};
