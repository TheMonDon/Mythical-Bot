const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Command = require('../../base/Command.js');

class Inventory extends Command {
  constructor(client) {
    super(client, {
      name: 'inventory',
      category: 'Items',
      description: "View yours or somebody else's inventory.",
      usage: 'inventory [member] [page]',
      aliases: ['inv'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem = msg.member;
    let page = 1;
    if (args.length === 2) {
      mem = await this.client.util.getMember(msg, args[0]);
      page = parseInt(args[1]?.replace(/[^0-9\\.]/g, '') || 1);
    } else if (args.length === 1) {
      if (!parseInt(args[0])) {
        mem = await this.client.util.getMember(msg, args[0]);
        if (!mem) mem = msg.member;
      } else {
        page = parseInt(args[0]?.replace(/[^0-9\\.]/g, '') || 1);
      }
    }
    mem = mem.user ? mem.user : mem;

    // Get total item count to calculate max pages
    const [countRows] = await this.client.db.execute(
      /* sql */
      `
        SELECT
          COUNT(*) AS count
        FROM
          economy_inventory
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [msg.guild.id, mem.id],
    );
    const totalItems = countRows[0].count;
    const itemsPerPage = 10;
    const maxPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Ensure page is within valid range
    page = Math.max(1, Math.min(page, maxPages));

    const generateInventoryEmbed = async (currentPage) => {
      const offset = (currentPage - 1) * itemsPerPage;

      // Fetch only the items for the current page, sorted by cost
      const [rows] = await this.client.db.execute(
        /* sql */
        `
          SELECT
            item_name,
            quantity,
            cost,
            description
          FROM
            economy_inventory
          WHERE
            server_id = ?
            AND user_id = ?
          ORDER BY
            quantity ASC
          LIMIT
            ?
          OFFSET
            ?
        `,
        [msg.guild.id, mem.id, itemsPerPage, offset],
      );

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${mem.username}'s Inventory`,
          iconURL: mem.displayAvatarURL(),
        })
        .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
        .setTimestamp();

      if (rows.length > 0) {
        const fields = rows.map((item) => ({
          name: `${item?.quantity || 1}x - ${item?.item_name}`,
          value: item?.description || 'No description available.',
          inline: false,
        }));
        embed
          .setColor(msg.settings.embedColor)
          .addFields(fields)
          .setDescription(`Use an item with \`${msg.settings.prefix}use [quantity] <name>\``);
      } else {
        embed
          .setColor(msg.settings.embedErrorColor)
          .setDescription(`You don't have any items, view available items with \`${msg.settings.prefix}store\``);
      }

      return embed;
    };

    const embed = await generateInventoryEmbed(page);
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
    const collector = message.createMessageComponentCollector({ time: 3600000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const embed = await generateInventoryEmbed(page);
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

      await interaction.update({ embeds: [embed], components: [updatedRow] });
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

module.exports = Inventory;
