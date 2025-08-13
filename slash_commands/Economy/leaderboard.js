const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
      .setDescription('Choose between Bank or Cash.')
      .addChoices({ name: 'Bank', value: 'bank' }, { name: 'Cash', value: 'cash' }),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  let page = interaction.options.getInteger('page') || 1;
  const cashOrBank = interaction.options.getString('type') || 'total';
  await interaction.guild.members.fetch();
  const usersCount = (await db.get(`servers.${interaction.guild.id}.users`))
    ? Object.keys(await db.get(`servers.${interaction.guild.id}.users`)).length
    : 0;
  const itemsPerPage = 10;
  const maxPages = Math.ceil(usersCount / itemsPerPage);

  if (page > maxPages) page = maxPages;

  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  // Fetch data for the current page
  const offset = (page - 1) * itemsPerPage;
  const usersData = (await db.get(`servers.${interaction.guild.id}.users`)) || {};

  const sortedLeaderboard = Object.entries(usersData)
    .map(([userId, data]) => {
      const cash = BigInt(data.economy?.cash || 0);
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
      const cash = BigInt(data.economy?.cash || 0);
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
  const userRank = fullLeaderboard.find((entry) => entry.userId === interaction.user.id);
  const userRankDisplay = userRank
    ? `Your leaderboard rank: ${getOrdinalSuffix(userRank.rank)}`
    : 'You are not on the leaderboard';

  const description =
    (
      await Promise.all(
        sortedLeaderboard.map(async (entry, index) => {
          const user = interaction.client.users.cache.get(entry.userId) ||
            (await interaction.client.users.fetch(entry.userId).catch(() => null)) || { tag: 'Unknown User' };

          const neg = entry.money < 0n;
          const money = neg ? -entry.money : entry.money;

          return `**${offset + index + 1}.** ${user.tag}: ${
            entry.money < 0n ? '-' : ''
          }${currencySymbol}${interaction.client.util.limitStringLength(money.toLocaleString(), 0, 150)}`;
        }),
      )
    ).join('\n') || 'None';

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setTitle(
      `${interaction.guild.name} ${
        cashOrBank === 'cash' ? 'Cash' : cashOrBank === 'bank' ? 'Bank' : 'Total'
      } Leaderboard`,
    )
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(description)
    .setFooter({ text: `Page ${page} / ${maxPages} • ${userRankDisplay}` })
    .setTimestamp();

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

  const message = await interaction.editReply({ embeds: [embed], components: [row] });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = message.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 3600000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.user.id !== interaction.user.id) {
      return interaction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
    }

    if (btnInteraction.customId === 'prev_page') page--;
    if (btnInteraction.customId === 'next_page') page++;

    // Calculate the offset and slice the leaderboard for the current page
    const offset = (page - 1) * itemsPerPage; // itemsPerPage is the number of users per page (e.g., 10)
    const currentPageLeaderboard = fullLeaderboard.slice(offset, offset + itemsPerPage);

    // Fetch user data for the current page asynchronously
    const displayedLeaderboard = await Promise.all(
      currentPageLeaderboard.map(async (entry, index) => {
        const user = await interaction.client.users.fetch(entry.userId).catch(() => null);
        const formattedMoney = interaction.client.util.limitStringLength(entry.money.toLocaleString(), 0, 150);
        return user
          ? `**${offset + index + 1}.** ${user.tag}: ${currencySymbol}${formattedMoney}`
          : `**${offset + index + 1}.** Unknown User: ${currencySymbol}${formattedMoney}`;
      }),
    );

    // Update the embed
    const updatedEmbed = new EmbedBuilder()
      .setColor(interaction.settings.embedColor)
      .setTitle(`${interaction.guild.name} Leaderboard`)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
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
    await btnInteraction.update({ embeds: [updatedEmbed], components: [updatedRow] });
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
    );
    message.edit({ components: [disabledRow] });
  });
};
