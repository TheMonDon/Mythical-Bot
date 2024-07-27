const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class Inventory extends Command {
  constructor(client) {
    super(client, {
      name: 'inventory',
      category: 'Items',
      description: "View yours or somebody else's inventory",
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

    const userInventory = (await db.get(`servers.${msg.guild.id}.users.${mem.id}.economy.inventory`)) || [];
    const itemsPerPage = 10; // Number of items per page
    const maxPages = Math.ceil(userInventory.length / itemsPerPage) || 1;

    // Ensure page is within valid range
    page = Math.max(1, Math.min(page, maxPages));

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedInventory = userInventory.slice(start, end);

    const inventoryDetails = paginatedInventory
      .map((item) => {
        return `**${item?.quantity || 1} - ${item?.name}**\n${item?.description}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${mem.username}'s Inventory`, iconURL: mem.displayAvatarURL() })
      .setColor(msg.settings.embedColor)
      .setDescription(inventoryDetails || 'Nothing to see here!')
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
    const collector = message.createMessageComponentCollector({ time: 2147483647 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== msg.author.id) {
        return interaction.reply({ content: 'These buttons are not for you!', ephemeral: true });
      }

      if (interaction.customId === 'prev_page') page--;
      if (interaction.customId === 'next_page') page++;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const newStart = (page - 1) * itemsPerPage;
      const newEnd = newStart + itemsPerPage;
      const newPaginatedInventory = userInventory.slice(newStart, newEnd);

      const newInventoryDetails = newPaginatedInventory
        .map((item) => {
          return `**${item?.quantity || 1} - ${item?.name}**\n${item?.description}`;
        })
        .join('\n');

      const updatedEmbed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: `${mem.username}'s Inventory`, iconURL: mem.displayAvatarURL() })
        .setDescription(newInventoryDetails || 'Nothing to see here!')
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

module.exports = Inventory;
