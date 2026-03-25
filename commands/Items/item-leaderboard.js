const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');
const Command = require('../../base/Command.js');

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
 
    const [countRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          COUNT(*) AS count
        FROM
          economy_inventory
        WHERE
          server_id = ?
          AND LOWER(item_name) = ?
      `,
      [msg.guild.id, itemName.toLowerCase()],
    );
    const totalEntries = countRows[0].count;

    if (totalEntries === 0) {
      return this.client.util.errorEmbed(msg, `No one owns the item "${itemName}".`, 'Item Not Found');
    }

    const itemsPerPage = 10; // Number of entries per page
    const maxPages = Math.ceil(totalEntries / itemsPerPage) || 1;

    // Ensure the page is within range
    page = Math.max(1, Math.min(page, maxPages));
 
    const generateEmbed = async (currentPage) => {
      const offset = (currentPage - 1) * itemsPerPage;
      const [rows] = await this.client.db.execute(
        /* sql */
        `
          SELECT
            user_id,
            item_name,
            quantity
          FROM
            economy_inventory
          WHERE
            server_id = ?
            AND LOWER(item_name) = ?
          ORDER BY
            quantity DESC
          LIMIT
            ?
          OFFSET
            ?
        `,
        [msg.guild.id, itemName.toLowerCase(), itemsPerPage, offset],
      );

      const leaderboardLines = await Promise.all(
        rows.map(async (row, index) => {
          const user =
            this.client.users.cache.get(row.user_id) || (await this.client.users.fetch(row.user_id).catch(() => null));
          const username = user ? user.tag : `Unknown User (${row.user_id})`;

          return {
            name: `#${offset + index + 1} - ${username}`,
            value: `Quantity: **${row.quantity}**`,
            inline: false,
          };
        }),
      );

      const embed = new EmbedBuilder()
        .setTitle(`Leaderboard for "${itemName}"`)
        .setColor(msg.settings.embedColor)
        .addFields(leaderboardLines)
        .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
        .setTimestamp();

      return embed;
    };

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
      const updatedEmbed = await generateEmbed(page);

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
