const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ItemLeaderboard extends Command {
  constructor(client) {
    super(client, {
      name: 'item-leaderboard',
      category: 'Items',
      description: 'View the leaderboard for a specific item.',
      usage: 'item-leaderboard <item> [page]',
      aliases: ['ilb', 'itemleaderboard'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const itemName = args[0];
    if (!itemName) {
      return this.client.util.errorEmbed(msg, 'Please specify the item you want to see the leaderboard for.');
    }

    let page = parseInt(args[1]?.replace(/[^0-9\\.]/g, '') || 1);

    // Fetch all inventories from the database
    const serverData = (await db.get(`servers.${msg.guild.id}.users`)) || {};
    const leaderboard = [];

    // Aggregate data for the specified item
    for (const userId in serverData) {
      const inventory = serverData[userId]?.economy?.inventory || [];
      inventory.forEach((item) => {
        // Skip invalid items
        if (!item || !item.name) return;

        if (item.name.toLowerCase() === itemName.toLowerCase()) {
          leaderboard.push({
            userId,
            quantity: item.quantity || 1,
          });
        }
      });
    }

    if (leaderboard.length === 0) {
      return this.client.util.errorEmbed(msg, `No one owns the item "${itemName}".`, 'Item Not Found');
    }

    // Sort leaderboard by quantity
    leaderboard.sort((a, b) => b.quantity - a.quantity);

    const itemsPerPage = 10; // Number of entries per page
    const maxPages = Math.ceil(leaderboard.length / itemsPerPage) || 1;

    // Ensure the page is within range
    page = Math.max(1, Math.min(page, maxPages));

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedLeaderboard = leaderboard.slice(start, end);

    // Build the fields for the embed
    const fields = await Promise.all(
      paginatedLeaderboard.map(async (entry, index) => {
        const user = await msg.guild.members.fetch(entry.userId);
        return {
          name: `#${start + index + 1} - ${user.user.tag}`,
          value: `Quantity: **${entry.quantity}**`,
          inline: false,
        };
      }),
    );

    const embed = new EmbedBuilder()
      .setTitle(`Leaderboard for "${itemName}"`)
      .setColor(msg.settings.embedColor)
      .addFields(fields)
      .setFooter({ text: `Page ${page} / ${maxPages}` })
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
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 3600000,
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== msg.author.id) {
        return btnInteraction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
      }

      if (btnInteraction.customId === 'prev_page') page--;
      if (btnInteraction.customId === 'next_page') page++;

      // Ensure page is within range
      page = Math.max(1, Math.min(page, maxPages));

      const newStart = (page - 1) * itemsPerPage;
      const newEnd = newStart + itemsPerPage;
      const newPaginatedLeaderboard = leaderboard.slice(newStart, newEnd);

      const newFields = await Promise.all(
        newPaginatedLeaderboard.map(async (entry, index) => {
          const user = await msg.guild.members.fetch(entry.userId);
          return {
            name: `#${newStart + index + 1} - ${user.user.tag}`,
            value: `Quantity: **${entry.quantity}**`,
            inline: false,
          };
        }),
      );

      const updatedEmbed = new EmbedBuilder()
        .setTitle(`Leaderboard for "${itemName}"`)
        .setColor(msg.settings.embedColor)
        .addFields(newFields)
        .setFooter({ text: `Page ${page} / ${maxPages}` })
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

      await btnInteraction.update({ embeds: [updatedEmbed], components: [updatedRow] });
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

module.exports = ItemLeaderboard;
