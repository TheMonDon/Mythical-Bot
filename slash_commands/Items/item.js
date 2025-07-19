const {
  EmbedBuilder,
  SlashCommandBuilder,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  MessageCollector,
} = require('discord.js');
const { stripIndents } = require('common-tags');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('item')
  .setDescription('Control various item things')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('buy')
      .setDescription('Buy an item from the store.')
      .addStringOption((option) =>
        option.setName('item').setDescription('The item you want to buy').setRequired(true).setAutocomplete(true),
      )
      .addIntegerOption((option) =>
        option.setName('quantity').setDescription('The quantity of the item you want to buy').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('inventory')
      .setDescription("View yours or somebody else's inventory.")
      .addUserOption((option) =>
        option.setName('member').setDescription('The member whose inventory you want to view').setRequired(false),
      )
      .addIntegerOption((option) =>
        option.setName('page').setDescription('The page of the inventory to view').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('info')
      .setDescription('View information about an item.')
      .addStringOption((option) =>
        option.setName('item').setDescription('The item you want to view').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('leaderboard')
      .setDescription('View the leaderboard for a specific item.')
      .addStringOption((option) =>
        option
          .setName('item')
          .setDescription('The item you want to view the leaderboard for')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addIntegerOption((option) =>
        option.setName('page').setDescription('The page of the leaderboard to view').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('sell')
      .setDescription('Sell an item to another member.')
      .addUserOption((option) =>
        option.setName('member').setDescription('The member you want to sell the item to').setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('item').setDescription('The item you want to sell').setRequired(true).setAutocomplete(true),
      )
      .addIntegerOption((option) =>
        option.setName('price').setDescription('The price you want to sell the item for').setRequired(true),
      )
      .addIntegerOption((option) =>
        option.setName('quantity').setDescription('The quantity of the item you want to sell').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('store')
      .setDescription('View the items available for purchase.')
      .addIntegerOption((option) =>
        option.setName('page').setDescription('The page of the store to view').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('use')
      .setDescription('Use an item from your inventory.')
      .addStringOption((option) =>
        option.setName('item').setDescription('The item you want to use').setRequired(true).setAutocomplete(true),
      )
      .addIntegerOption((option) =>
        option.setName('quantity').setDescription('The quantity of the item you want to use').setRequired(false),
      ),
  );

exports.autoComplete = async (interaction) => {
  try {
    const focusedValue = interaction.options.getFocused();
    const store = (await db.get(`servers.${interaction.guild.id}.economy.store`)) || {};

    // Filter keys based on user input
    const choices = Object.keys(store).filter((item) => item.toLowerCase().includes(focusedValue.toLowerCase()));

    // Respond with up to 25 choices (Discord limit)
    await interaction.respond(
      choices.slice(0, 25).map((choice) => ({
        name: choice,
        value: choice,
      })),
    );
  } catch (error) {
    console.error(error);
    return interaction.respond([]).catch(() => {});
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();
  const store = (await db.get(`servers.${interaction.guild.id}.economy.store`)) || {};

  switch (subcommand) {
    case 'buy': {
      const itemName = interaction.options.getString('item').toLowerCase();
      const quantity = interaction.options.getInteger('quantity') || 1;
      if (!itemName) return interaction.editReply('Please specify an item to buy.');

      // Find the item in the store regardless of case
      const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);
      if (!itemKey) return interaction.editReply('That item does not exist in the store.');

      const item = store[itemKey];
      const itemCost = BigInt(item.cost);
      let userCash = BigInt(
        await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`),
      );
      if (userCash < itemCost * BigInt(quantity))
        return interaction.editReply('You do not have enough money to buy this item.');

      if (item.stock && item.stock < quantity) {
        return interaction.editReply(`The store only has ${item.stock} stock remaining.`);
      }

      if (item.stock) {
        item.stock -= quantity;
        if (item.stock === 0) {
          await db.delete(`servers.${interaction.guild.id}.economy.store.${itemKey}`);
        } else {
          store[itemKey] = item;
          await db.set(`servers.${interaction.guild.id}.economy.store`, store);
        }
      }

      if (item.roleRequired) {
        const roleRequired = interaction.client.util.getRole(interaction, item.roleRequired);
        if (roleRequired) {
          // Check if the member has the role
          const hasRole = interaction.member.roles.cache.has(roleRequired.id);
          if (!hasRole) {
            return interaction.editReply(
              `You do not have the required role **${roleRequired.name}** to purchase this item.`,
            );
          }
        } else {
          return interaction.editReply(
            'The required role no longer exists, please contact a server administrator to purchase this item.',
          );
        }
      }

      if (item.roleGiven || item.roleRemoved) {
        if (!interaction.guild.members.me.permissions.has('ManageRoles'))
          return interaction.client.util.errorEmbed(
            interaction,
            'Manage Roles permission is required on the bot to buy this item.',
            'Missing Permission',
          );
      }

      // Deduct the cost from the user's cash
      userCash = userCash - itemCost * BigInt(quantity);
      await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, userCash.toString());

      if (!item.inventory) {
        if (item.roleGiven) {
          const role = interaction.client.util.getRole(interaction, item.roleGiven);
          await interaction.member.roles.add(role).catch((error) => interaction.channel.send(error));
        }
        if (item.roleRemoved) {
          const role = interaction.client.util.getRole(interaction, item.roleRemoved);
          await interaction.member.roles.remove(role).catch((error) => interaction.channel.send(error));
        }
        if (!item.replyMessage) {
          return interaction.editReply('👍');
        }

        // Replace Member
        const memberCreatedAt = moment(interaction.user.createdAt);
        const memberCreated = memberCreatedAt.format('D MM YY');
        const memberCreatedDuration = memberCreatedAt.from(moment(), true);
        let replyMessage = item.replyMessage
          .replace('{member.id}', interaction.user.id)
          .replace('{member.username}', interaction.user.username)
          .replace('{member.tag}', interaction.user.tag)
          .replace('{member.mention}', interaction.user)
          .replace('{member.created}', memberCreated)
          .replace('{member.created.duration}', memberCreatedDuration);

        // Replace Server
        const guildCreatedAt = moment(interaction.guild.createdAt);
        const serverCreated = guildCreatedAt.format('D MM YY');
        const serverCreatedDuration = guildCreatedAt.from(moment(), true);

        replyMessage = replyMessage
          .replace('{server.id}', interaction.guild.id)
          .replace('{server.name}', interaction.guild.name)
          .replace('{server.members}', interaction.guild.memberCount.toLocaleString())
          .replace('{server.created}', serverCreated)
          .replace('{servers.created.duration', serverCreatedDuration);

        const role =
          interaction.client.util.getRole(interaction, item.roleGiven) ||
          interaction.client.util.getRole(interaction, item.roleRemoved) ||
          interaction.client.util.getRole(interaction, item.roleRequired);

        if (role) {
          const roleCreatedAt = moment(role.createdAt);
          const roleCreated = roleCreatedAt.format('D MM YY');
          const roleCreatedDuration = roleCreatedAt.from(moment(), true);

          replyMessage = replyMessage
            .replace('{role.id}', role.id)
            .replace('{role.name}', role.name)
            .replace('{role.mention}', role)
            .replace('{role.members}', role.members.size.toLocaleString())
            .replace('{role.created}', roleCreated)
            .replace('{role.created.duration}', roleCreatedDuration);
        }
        return interaction.editReply(replyMessage);
      }

      const userInventory =
        (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.inventory`)) || [];

      // Find the item in the user's inventory by its unique ID instead of name
      const itemIndex = userInventory.findIndex((inventoryItem) => inventoryItem?.id === item.id);

      if (itemIndex !== -1) {
        // If the item is found, increment the quantity
        userInventory[itemIndex].quantity += quantity;
        userInventory[itemIndex] = {
          ...userInventory[itemIndex],
          name: itemKey,
          ...item,
        };
      } else {
        // Ensure item has a unique ID and name when stored
        userInventory.push({
          id: item.id,
          name: itemKey,
          quantity,
          ...item,
        });
      }

      await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.inventory`, userInventory);

      const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
      const itemCostQuantity = (itemCost * BigInt(quantity)).toLocaleString();
      const csCost = interaction.client.util.limitStringLength(currencySymbol + itemCostQuantity, 0, 700);

      const purchaseEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('Purchase Successful')
        .setDescription(
          `You have bought ${quantity} ${itemKey}${
            quantity > 1 ? "'s" : ''
          } for ${csCost}! This is now in your inventory. \nUse this item with the \`use-item\` command.`,
        )
        .setColor(interaction.settings.embedColor)
        .setTimestamp();

      return interaction.editReply({ embeds: [purchaseEmbed] });
    }

    case 'inventory': {
      const mem = interaction.options.getUser('member') || interaction.user;
      let page = interaction.options.getInteger('page') || 1;

      const userInventory = (await db.get(`servers.${interaction.guild.id}.users.${mem.id}.economy.inventory`)) || [];
      const itemsPerPage = 10;
      const maxPages = Math.ceil(userInventory.length / itemsPerPage) || 1;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedInventory = userInventory.slice(start, end);

      // Build the fields for the embed
      const fields = paginatedInventory.map((item) => ({
        name: `${item?.quantity || 1} - ${item?.name}`,
        value: item?.description || 'No description available.',
        inline: false,
      }));

      let embed;
      if (!fields || fields.length < 1) {
        embed = new EmbedBuilder()
          .setAuthor({ name: `${mem.username}'s Inventory`, iconURL: mem.displayAvatarURL() })
          .setColor(interaction.settings.embedErrorColor)
          .setDescription(`You don't have any items, view available items with the \`store\` command.`)
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setAuthor({ name: `${mem.username}'s Inventory`, iconURL: mem.displayAvatarURL() })
          .setColor(interaction.settings.embedColor)
          .setDescription(`Use an item with the \`use [quantity] <name>\` command`)
          .addFields(fields)
          .setFooter({ text: `Page ${page} / ${maxPages}` })
          .setTimestamp();
      }

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
      const collector = message.createMessageComponentCollector({ time: 3600000 });

      collector.on('collect', async (int) => {
        if (int.user.id !== interaction.user.id) {
          return int.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
        }

        if (int.customId === 'prev_page') page--;
        if (int.customId === 'next_page') page++;

        // Ensure page is within valid range
        page = Math.max(1, Math.min(page, maxPages));

        const newStart = (page - 1) * itemsPerPage;
        const newEnd = newStart + itemsPerPage;
        const newPaginatedInventory = userInventory.slice(newStart, newEnd);

        // Build the new fields for the updated embed
        const newFields = newPaginatedInventory.map((item) => ({
          name: `${item?.quantity || 1} -  ${item?.name}`,
          value: item?.description || 'No description available.',
          inline: false,
        }));

        const updatedEmbed = new EmbedBuilder()
          .setColor(interaction.settings.embedColor)
          .setAuthor({ name: `${mem.username}'s Inventory`, iconURL: mem.displayAvatarURL() })
          .setDescription(`Use an item with the \`use [quantity] <name>\` command`)
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

        await int.update({ embeds: [updatedEmbed], components: [updatedRow] });
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
      break;
    }

    case 'info': {
      const itemName = interaction.options.getString('item').toLowerCase();

      // Find the item in the store regardless of case
      const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

      const item = store[itemKey];
      if (!item) {
        return interaction.client.util.errorEmbed(interaction, 'That item does not exist in the store.');
      }

      const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
      const cost = currencySymbol + BigInt(item.cost).toLocaleString();
      const requiredBalance = item.requiredBalance
        ? currencySymbol + BigInt(item.requiredBalance).toLocaleString()
        : 'None';
      const timeRemainingString = item.timeRemaining
        ? `Deleted <t:${Math.floor(item.timeRemaining / 1000)}:R>`
        : 'No time limit';

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('Item Info')
        .addFields([
          { name: 'Name', value: itemKey, inline: true },
          { name: 'Cost', value: interaction.client.util.limitStringLength(cost, 0, 1024), inline: true },
          { name: 'Description', value: item.description, inline: false },
          { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
          { name: 'Time Remaining', value: timeRemainingString, inline: true },
          { name: 'Stock Remaining', value: item.stock ? item.stock.toLocaleString() : 'Infinity', inline: true },
          {
            name: 'Role Required',
            value: item.roleRequired
              ? interaction.client.util.getRole(interaction, item.roleRequired).toString()
              : 'None',
            inline: true,
          },
          {
            name: 'Role Given',
            value: item.roleGiven ? interaction.client.util.getRole(interaction, item.roleGiven).toString() : 'None',
            inline: true,
          },
          {
            name: 'Role Removed',
            value: item.roleRemoved
              ? interaction.client.util.getRole(interaction, item.roleRemoved).toString()
              : 'None',
            inline: true,
          },
          {
            name: 'Required Balance',
            value: interaction.client.util.limitStringLength(requiredBalance, 0, 1024),
            inline: true,
          },
          { name: 'Reply Message', value: item.replyMessage || 'None', inline: true },
        ]);

      return interaction.editReply({ embeds: [embed] });
    }

    case 'leaderboard': {
      let page = interaction.options.getInteger('page') || 1;
      const itemName = interaction.options.getString('item');

      // Fetch all inventories from the database
      const serverData = (await db.get(`servers.${interaction.guild.id}.users`)) || {};
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
        return interaction.client.util.errorEmbed(interaction, `No one owns the item "${itemName}".`, 'Item Not Found');
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
          const user = await interaction.guild.members.fetch(entry.userId);
          return {
            name: `#${start + index + 1} - ${user.user.tag}`,
            value: `Quantity: **${entry.quantity}**`,
            inline: false,
          };
        }),
      );

      const embed = new EmbedBuilder()
        .setTitle(`Leaderboard for "${itemName}"`)
        .setColor(interaction.settings.embedColor)
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

      const message = await interaction.editReply({ embeds: [embed], components: [row] });
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 3600000,
      });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
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
            const user = await interaction.guild.members.fetch(entry.userId);
            return {
              name: `#${newStart + index + 1} - ${user.user.tag}`,
              value: `Quantity: **${entry.quantity}**`,
              inline: false,
            };
          }),
        );

        const updatedEmbed = new EmbedBuilder()
          .setTitle(`Leaderboard for "${itemName}"`)
          .setColor(interaction.settings.embedColor)
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
      break;
    }

    case 'sell': {
      const member = interaction.options.getUser('member');
      const quantity = interaction.options.getInteger('quantity') || 1;
      let itemName = interaction.options.getString('item').toLowerCase();
      const price = interaction.options.getInteger('price');

      // Get the seller's inventory
      const sellerInventory =
        (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.inventory`)) || [];

      // Find the item in the seller's inventory
      const itemIndex = (sellerInventory || []).findIndex((inventoryItem) => {
        // Check if inventoryItem exists and has a name property
        if (inventoryItem && inventoryItem.name) {
          return inventoryItem.name.toLowerCase() === itemName;
        }
        return false;
      });

      if (!itemIndex || itemIndex === -1 || sellerInventory[itemIndex].quantity < quantity) {
        return interaction.client.util.errorEmbed(
          interaction,
          'You do not have enough of this item in your inventory.',
        );
      }

      const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
      itemName = sellerInventory[itemIndex].name;

      // Check buyer's balance
      let buyerCash = BigInt(await db.get(`servers.${interaction.guild.id}.users.${member.id}.economy.cash`));
      const totalCost = BigInt(price);
      if (buyerCash < totalCost) {
        return interaction.client.util.errorEmbed(interaction, `${member} cannot afford this.`, 'Insufficient Funds');
      }

      // Ask the buyer for confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(
          `${interaction.user} wants to sell you ${quantity} ${itemName}${
            quantity > 1 ? "'s" : ''
          } for ${currencySymbol}${price}. \nDo you accept this? (yes/no)`,
        )
        .setFooter({ text: `Deal ends in 5 minutes` });
      await interaction.editReply({ content: member.toString(), embeds: [confirmEmbed] });

      const confirmFilter = (response) => response.author.id === member.id;
      const confirmCollector = new MessageCollector(interaction.channel, {
        filter: confirmFilter,
        time: 300000,
        max: 1,
      });

      confirmCollector.on('collect', async (confirmation) => {
        if (interaction.client.util.yes.includes(confirmation.content.toLowerCase())) {
          // Transfer money and update inventories
          buyerCash -= totalCost;
          await db.set(`servers.${interaction.guild.id}.users.${member.id}.economy.cash`, buyerCash.toString());

          let sellerCash = BigInt(
            await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`),
          );
          sellerCash += totalCost;
          await db.set(
            `servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`,
            sellerCash.toString(),
          );

          // Update seller's inventory
          sellerInventory[itemIndex].quantity -= quantity;
          if (sellerInventory[itemIndex].quantity === 0) sellerInventory.splice(itemIndex, 1);
          await db.set(
            `servers.${interaction.guild.id}.users.${interaction.member.id}.economy.inventory`,
            sellerInventory,
          );

          // Update buyer's inventory
          const buyerInventory =
            (await db.get(`servers.${interaction.guild.id}.users.${member.id}.economy.inventory`)) || [];
          const buyerItemIndex = buyerInventory.findIndex((invItem) => invItem?.id === sellerInventory[itemIndex].id);
          if (buyerItemIndex !== -1) {
            buyerInventory[buyerItemIndex].quantity += quantity;
          } else {
            buyerInventory.push({
              id: sellerInventory[itemIndex].id,
              quantity,
              ...sellerInventory[itemIndex],
            });
          }
          await db.set(`servers.${interaction.guild.id}.users.${member.id}.economy.inventory`, buyerInventory);

          // Send confirmation message
          const confirmEmbed = new EmbedBuilder()
            .setColor(interaction.settings.embedColor)
            .setDescription(
              `✅ Trade Complete \n${member} has received ${quantity} ${sellerInventory[itemIndex].name}${
                quantity > 1 ? 's' : ''
              } for ${currencySymbol}${price} from ${interaction.user}`,
            );
          return interaction.channel.send({ embeds: [confirmEmbed] });
        } else {
          return interaction.client.util.errorEmbed(
            interaction,
            'The buyer declined the offer. The sale has been canceled.',
            'Offer Declined',
          );
        }
      });

      confirmCollector.on('end', (collected) => {
        if (collected.size === 0) {
          const noCollectionEmbed = new EmbedBuilder()
            .setColor(interaction.settings.embedErrorColor)
            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
            .setDescription(
              `Cancelled the transaction of ${quantity} ${sellerInventory[itemIndex].name}${
                quantity > 1 ? "'s" : ''
              } for ${currencySymbol}${price} between ${interaction.user} and ${member}.`,
            );
          return interaction.channel.send({ embeds: [noCollectionEmbed] });
        }
      });

      break;
    }

    case 'store': {
      let page = interaction.options.getInteger('page') || 1;

      const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
      const store = (await db.get(`servers.${interaction.guild.id}.economy.store`)) || {};

      // Sort store by item cost
      const sortedStore = Object.entries(store).sort(([, itemInfoA], [, itemInfoB]) => itemInfoA.cost - itemInfoB.cost);

      // Construct the message with item names
      const itemDetails = sortedStore.map(([itemName, itemInfo]) => {
        const csCost = currencySymbol + BigInt(itemInfo.cost).toLocaleString();
        return {
          name: `${interaction.client.util.limitStringLength(csCost, 0, 100)} - ${itemName}`,
          value: `${itemInfo.description}`,
          inline: false,
        };
      });

      const maxPages = Math.ceil(itemDetails.length / 10) || 1;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      let displayedStore = itemDetails.slice((page - 1) * 10, page * 10);

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(`${interaction.guild.name} Store`)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
        .addFields(displayedStore)
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

      if (!itemDetails.length) {
        const errorEmbed = new EmbedBuilder()
          .setColor(interaction.settings.embedColor)
          .setTitle(`${interaction.guild.name} Store`)
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
          .setDescription(
            stripIndents`
              The store is empty. Someone probably robbed it :shrug:
              Add items to the store using the \`create-item\` command.`,
          )
          .setFooter({ text: `Page ${page} / ${maxPages}` });

        return interaction.editReply({ embeds: [errorEmbed], components: [row] });
      }

      const message = await interaction.editReply({ embeds: [embed], components: [row] });
      const collector = message.createMessageComponentCollector({ time: 3600000 });

      collector.on('collect', async (int) => {
        if (int.user.id !== interaction.user.id) {
          return int.reply({ content: 'These buttons are not for you!', flags: MessageFlags.Ephemeral });
        }

        if (int.customId === 'prev_page') page--;
        if (int.customId === 'next_page') page++;

        // Ensure page is within valid range
        page = Math.max(1, Math.min(page, maxPages));

        displayedStore = itemDetails.slice((page - 1) * 10, page * 10);

        const updatedEmbed = new EmbedBuilder()
          .setColor(interaction.settings.embedColor)
          .setTitle(`${interaction.guild.name} Store`)
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
          .addFields(displayedStore)
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

        await int.update({ embeds: [updatedEmbed], components: [updatedRow] });
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
      break;
    }

    case 'use': {
      const itemName = interaction.options.getString('item').toLowerCase();
      const quantity = interaction.options.getInteger('quantity') || 1;

      // Fetch user's inventory from the database
      const userInventory =
        (await db.get(`servers.${interaction.guild.id}.users.${interaction.user.id}.economy.inventory`)) || [];

      // Find the item in the store regardless of case
      const itemIndex = userInventory.findIndex((inventoryItem) => inventoryItem?.name?.toLowerCase() === itemName);

      // Check if the item exists in the user's inventory
      if (!userInventory[itemIndex]) {
        return interaction.client.util.errorEmbed(interaction, 'You do not have this item in your inventory.');
      }

      const item = userInventory[itemIndex];
      if (item.roleRequired) {
        const roleRequired = interaction.client.util.getRole(interaction, item.roleRequired);
        if (roleRequired) {
          // Check if the member has the role
          const hasRole = interaction.member.roles.cache.has(roleRequired.id);
          if (!hasRole) {
            return interaction.client.util.errorEmbed(
              interaction,
              `You do not have the required role **${roleRequired.name}** to use this item.`,
            );
          }
        } else {
          return interaction.editReply(
            'The required role no longer exists, please contact a server administrator to use this item.',
          );
        }
      }

      const itemAmount = item.quantity - quantity;

      if (itemAmount < 0) {
        return interaction.client.util.errorEmbed(
          interaction,
          `You do not have enough of this item to use. You only have ${item.quantity} of this item in your inventory.`,
        );
      }

      item.quantity -= quantity;
      let filteredInventory = userInventory;

      if (!item.quantity || item.quantity < 1) {
        delete userInventory[itemIndex];
        // Remove null values
        filteredInventory = await userInventory.filter((item) => item != null);
      }

      await db.set(`servers.${interaction.guild.id}.users.${interaction.user.id}.economy.inventory`, filteredInventory);

      if (item.roleGiven) {
        const roleGiven = interaction.client.util.getRole(interaction, item.roleGiven);
        await interaction.member.roles.add(roleGiven).catch((error) => interaction.channel.send(error));
      }
      if (item.roleRemoved) {
        const roleRemoved = interaction.client.util.getRole(interaction, item.roleRemoved);
        await interaction.member.roles.remove(roleRemoved).catch((error) => interaction.channel.send(error));
      }
      if (!item.replyMessage) {
        return interaction.editReply('👍');
      }

      // Replace Member
      const memberCreatedAt = moment(interaction.user.createdAt);
      const memberCreated = memberCreatedAt.format('D MM YY');
      const memberCreatedDuration = memberCreatedAt.from(moment(), true);
      let replyMessage = item.replyMessage
        .replace('{member.id}', interaction.user.id)
        .replace('{member.username}', interaction.user.username)
        .replace('{member.tag}', interaction.user.tag)
        .replace('{member.mention}', interaction.user)
        .replace('{member.created}', memberCreated)
        .replace('{member.created.duration}', memberCreatedDuration);

      // Replace Server
      const guildCreatedAt = moment(interaction.guild.createdAt);
      const serverCreated = guildCreatedAt.format('D MM YY');
      const serverCreatedDuration = guildCreatedAt.from(moment(), true);

      replyMessage = replyMessage
        .replace('{server.id}', interaction.guild.id)
        .replace('{server.name}', interaction.guild.name)
        .replace('{server.members}', interaction.guild.memberCount.toLocaleString())
        .replace('{server.created}', serverCreated)
        .replace('{servers.created.duration', serverCreatedDuration);

      const role =
        interaction.client.util.getRole(interaction, item.roleGiven) ||
        interaction.client.util.getRole(interaction, item.roleRemoved) ||
        interaction.client.util.getRole(interaction, item.roleRequired);

      if (role) {
        const roleCreatedAt = moment(role.createdAt);
        const roleCreated = roleCreatedAt.format('D MM YY');
        const roleCreatedDuration = roleCreatedAt.from(moment(), true);

        replyMessage = replyMessage
          .replace('{role.id}', role.id)
          .replace('{role.name}', role.name)
          .replace('{role.mention}', role)
          .replace('{role.members}', role.members.size.toLocaleString())
          .replace('{role.created}', roleCreated)
          .replace('{role.created.duration}', roleCreatedDuration);
      }

      return interaction.editReply(replyMessage);
    }
  }
};
