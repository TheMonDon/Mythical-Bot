const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
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
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const page = interaction.options.getInteger('page') || 1;

  await interaction.guild.members.fetch();

  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
  const usersData = (await db.get(`servers.${interaction.guild.id}.users`)) || {};
  const leaderboard = [];

  // Cache users and add them to the leaderboard
  for (const userId in usersData) {
    try {
      const user = await interaction.client.users.fetch(userId);
      if (user) {
        const cash = BigInt(parseInt(usersData[userId].economy.cash || 0, 10));
        const bank = BigInt(parseInt(usersData[userId].economy.bank || 0, 10));
        const money = cash + bank;
        leaderboard.push({ user: user.tag, userId: user.id, money });
      }
    } catch (err) {
      console.error(`Leaderboard: ${err}`);
    }
  }

  // Sort the leaderboard
  const sortedLeaderboard = leaderboard
    .sort((a, b) => (b.money > a.money ? 1 : -1))
    .map((c, index) => {
      const neg = c.money < 0n;
      const money = neg ? c.money * -1n : c.money;
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
  const userRank = sortedLeaderboard.find((entry) => entry.userId === interaction.user.id);
  const userRankDisplay = userRank
    ? `Your leaderboard rank: ${getOrdinalSuffix(userRank.rank)}`
    : 'You are not on the leaderboard';

  let realPage = page;
  const maxPages = Math.ceil((sortedLeaderboard.length + 1) / 10);
  let displayedLeaderboard = sortedLeaderboard.slice((page - 1) * 10, page * 10);

  // Create the pages
  if (displayedLeaderboard.length < 1) {
    for (let i = 1; i <= page; i++) {
      displayedLeaderboard = sortedLeaderboard.slice((i - 1) * 10, i * 10);
      if (displayedLeaderboard.length > 0) {
        realPage = i;
        break;
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedColor)
    .setTitle(`${interaction.guild.name}'s Leaderboard`)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setDescription(`${displayedLeaderboard.map((entry) => entry.display).join('\n') || 'None'}`)
    .setFooter({ text: `Page ${realPage} / ${maxPages} • ${userRankDisplay}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(realPage === 1),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(realPage === maxPages),
  );

  const message = await interaction.editReply({ embeds: [embed], components: [row] });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = message.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 2147483647,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'prev') {
      realPage -= 1;
    } else if (i.customId === 'next') {
      realPage += 1;
    }

    displayedLeaderboard = sortedLeaderboard.slice((realPage - 1) * 10, realPage * 10);

    const updatedEmbed = new EmbedBuilder()
      .setColor(interaction.settings.embedColor)
      .setTitle(`${interaction.guild.name}'s Leaderboard`)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(`${displayedLeaderboard.map((entry) => entry.display).join('\n') || 'None'}`)
      .setFooter({ text: `Page ${realPage} / ${maxPages} • ${userRankDisplay}` })
      .setTimestamp();

    await i.update({
      embeds: [updatedEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(realPage === 1),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(realPage === maxPages),
        ),
      ],
    });
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true),
    );
    message.edit({ components: [disabledRow] });
  });
};
