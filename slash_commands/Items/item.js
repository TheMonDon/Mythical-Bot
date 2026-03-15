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
const { Duration, DateTime } = require('luxon');

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
    if (!focusedValue) {
      const [rows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_store
          WHERE
            server_id = ?
          ORDER BY
            cost ASC
          LIMIT
            25
        `,
        [interaction.guild.id],
      );
      const choices = rows.map((row) => row.item_name);
      return interaction.respond(
        choices.slice(0, 25).map((choice) => ({
          name: choice,
          value: choice,
        })),
      );
    }

    const [rows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_store
        WHERE
          server_id = ?
          AND LOWER(item_name) LIKE ?
        LIMIT
          25
      `,
      [interaction.guild.id, `%${focusedValue.toLowerCase()}%`],
    );
    const choices = rows.map((row) => row.item_name);

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

  switch (subcommand) {
    case 'buy': {
      const itemName = interaction.options.getString('item').toLowerCase();
      const quantity = interaction.options.getInteger('quantity') || 1;
      if (!itemName) return interaction.editReply('Please specify an item to buy.');

      // Find the item in the store regardless of case
      const [storeRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_store
          WHERE
            server_id = ?
            AND LOWER(item_name) = ?
        `,
        [interaction.guild.id, itemName],
      );
      const item = storeRows[0];
      if (!item) return interaction.editReply('That item does not exist in the store.');

      const itemCost = BigInt(item.cost);

      const [economyRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_settings
          WHERE
            server_id = ?
        `,
        [interaction.guild.id],
      );
      const currencySymbol = economyRows[0]?.symbol || '$';

      const [balanceRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            cash
          FROM
            economy_balances
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [interaction.guild.id, interaction.member.id],
      );
      const userCash = BigInt(balanceRows[0]?.cash ?? economyRows[0]?.start_balance ?? 0);
      if (userCash < itemCost * BigInt(quantity))
        return interaction.editReply('You do not have enough money to buy this item.');

      if (item.stock !== -1 && item.stock < quantity) {
        return interaction.editReply(`The store only has ${item.stock} stock remaining.`);
      }

      if (item.stock !== -1) {
        item.stock -= quantity;
        if (item.stock === 0) {
          await interaction.client.db.execute(
            /* sql */ `
              DELETE FROM economy_store
              WHERE
                server_id = ?
                AND item_id = ?
            `,
            [interaction.guild.id, item.item_id],
          );
        } else {
          await interaction.client.db.execute(
            /* sql */ `
              UPDATE economy_store
              SET
                stock = ?
              WHERE
                server_id = ?
                AND item_id = ?
            `,
            [item.stock, interaction.guild.id, item.item_id],
          );
        }
      }

      if (item.role_required) {
        const roleRequired = interaction.client.util.getRole(interaction, item.role_required);
        if (roleRequired) {
          // Check if the member has the role
          const hasRole = interaction.member.roles.cache.has(roleRequired.id);
          if (!hasRole) {
            return interaction.editReply(
              `You do not have the required role **${roleRequired.name}** to purchase this item.`,
            );
          }
        }
      }

      if (item.role_given || item.role_removed) {
        if (!interaction.guild.members.me.permissions.has('ManageRoles'))
          return interaction.client.util.errorEmbed(
            interaction,
            'Manage Roles permission is required on the bot to buy this item.',
            'Missing Permission',
          );
      }

      // Deduct the cost from the user's cash
      const amount = itemCost * BigInt(quantity);
      await interaction.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_balances (server_id, user_id, cash)
          VALUES
            (?, ?, ?) ON DUPLICATE KEY
          UPDATE cash = cash -
          VALUES
            (cash)
        `,
        [interaction.guild.id, interaction.member.id, amount.toString()],
      );

      if (!item.inventory) {
        if (item.role_given) {
          const role = interaction.client.util.getRole(interaction, item.role_given);
          await interaction.member.roles.add(role).catch((error) => interaction.channel.send(error));
        }
        if (item.role_removed) {
          const role = interaction.client.util.getRole(interaction, item.role_removed);
          await interaction.member.roles.remove(role).catch((error) => interaction.channel.send(error));
        }
        if (!item.reply_message) {
          return interaction.editReply('👍');
        }

        // Replace Member
        // Calculate the duration since the member's account was created
        const memberCreatedDuration = Duration.fromMillis(Date.now() - interaction.user.createdAt.getTime())
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        // Format the member's account creation date
        const memberCreated = DateTime.fromMillis(interaction.user.createdAt.getTime()).toFormat('MMMM dd, yyyy');

        let replyMessage = item.reply_message
          .replace('{member.id}', interaction.user.id)
          .replace('{member.username}', interaction.user.username)
          .replace('{member.tag}', interaction.user.tag)
          .replace('{member.mention}', interaction.user)
          .replace('{member.created}', memberCreated)
          .replace('{member.created.duration}', memberCreatedDuration);

        // Replace Server
        // Calculate the duration since the server was created
        const serverCreatedDuration = Duration.fromMillis(Date.now() - interaction.guild.createdAt.getTime())
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        // Format the server's creation date
        const serverCreated = DateTime.fromMillis(interaction.guild.createdAt.getTime()).toFormat('MMMM dd, yyyy');

        replyMessage = replyMessage
          .replace('{server.id}', interaction.guild.id)
          .replace('{server.name}', interaction.guild.name)
          .replace('{server.members}', interaction.guild.memberCount.toLocaleString())
          .replace('{server.created}', serverCreated)
          .replace('{server.created.duration}', serverCreatedDuration);

        const role =
          interaction.client.util.getRole(interaction, item.roleGiven) ||
          interaction.client.util.getRole(interaction, item.roleRemoved) ||
          interaction.client.util.getRole(interaction, item.roleRequired);

        if (role) {
          // Calculate the duration since the role was created
          const roleCreatedDuration = Duration.fromMillis(Date.now() - role.createdAt.getTime())
            .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
            .toHuman({ maximumFractionDigits: 2, showZeros: false });

          // Format the role's creation date
          const roleCreated = DateTime.fromMillis(role.createdAt.getTime()).toFormat('MMMM dd, yyyy');

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

      await interaction.client.db.execute(
        /* sql */
        `
          INSERT INTO
            economy_inventory (
              server_id,
              user_id,
              item_id,
              item_name,
              quantity,
              cost,
              description,
              inventory,
              time_remaining,
              role_required,
              role_given,
              role_removed,
              reply_message
            )
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
          UPDATE quantity = quantity +
          VALUES
            (quantity),
            item_name =
          VALUES
            (item_name),
            cost =
          VALUES
            (cost),
            description =
          VALUES
            (description),
            inventory =
          VALUES
            (inventory),
            time_remaining =
          VALUES
            (time_remaining),
            role_required =
          VALUES
            (role_required),
            role_given =
          VALUES
            (role_given),
            role_removed =
          VALUES
            (role_removed),
            reply_message =
          VALUES
            (reply_message)
        `,
        [
          interaction.guild.id,
          interaction.user.id,
          item.item_id,
          item.item_name,
          quantity,
          item.cost,
          item.description,
          item.inventory,
          item.time_remaining,
          item.role_required,
          item.role_given,
          item.role_removed,
          item.reply_message,
        ],
      );

      const itemCostQuantity = (itemCost * BigInt(quantity)).toLocaleString();
      const csCost = interaction.client.util.limitStringLength(currencySymbol + itemCostQuantity, 0, 700);

      const purchaseEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
        .setTitle('Purchase Successful')
        .setDescription(
          `You have bought ${quantity} ${item.item_name}${
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

      // Get total item count to calculate max pages
      const [countRows] = await interaction.client.db.execute(
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
        [interaction.guild.id, mem.id],
      );
      const totalItems = countRows[0].count;
      const itemsPerPage = 10;
      const maxPages = Math.ceil(totalItems / itemsPerPage) || 1;

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const generateInventoryEmbed = async (currentPage) => {
        const offset = (currentPage - 1) * itemsPerPage;

        // Fetch only the items for the current page, sorted by cost
        const [rows] = await interaction.client.db.execute(
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
          [interaction.guild.id, mem.id, itemsPerPage, offset],
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
            .setColor(interaction.settings.embedColor)
            .addFields(fields)
            .setDescription(`Use an item with \`${interaction.settings.prefix}use [quantity] <name>\``);
        } else {
          embed
            .setColor(interaction.settings.embedErrorColor)
            .setDescription(
              `You don't have any items, view available items with \`${interaction.settings.prefix}store\``,
            );
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

        const updatedEmbed = await generateInventoryEmbed(page);
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

      const [storeRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_store
          WHERE
            server_id = ?
            AND LOWER(item_name) = ?
        `,
        [interaction.guild.id, itemName],
      );

      let item = storeRows[0];
      if (!item) {
        const [inventoryRows] = await interaction.client.db.execute(
          /* sql */ `
            SELECT
              *
            FROM
              economy_inventory
            WHERE
              server_id = ?
              AND user_id = ?
              AND LOWER(item_name) = ?
          `,
          [interaction.guild.id, interaction.user.id, itemName],
        );
        item = inventoryRows[0];

        if (!item) {
          return interaction.client.util.errorEmbed(
            interaction,
            'That item does not exist in the store or your inventory.',
          );
        }
      }

      const [economyRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_settings
          WHERE
            server_id = ?
        `,
        [interaction.guild.id],
      );
      const currencySymbol = economyRows[0]?.symbol || '$';
      const cost = currencySymbol + BigInt(item.cost).toLocaleString();
      const requiredBalance = item.required_balance
        ? currencySymbol + BigInt(item.required_balance).toLocaleString()
        : 'None';
      const timeRemainingString = item.time_remaining
        ? `Deleted <t:${Math.floor(item.time_remaining / 1000)}:R>`
        : 'No time limit';

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
        .setTitle('Item Info')
        .addFields([
          { name: 'Name', value: item.item_name, inline: true },
          { name: 'Cost', value: interaction.client.util.limitStringLength(cost, 0, 1024), inline: true },
          { name: 'Description', value: item.description, inline: false },
          { name: 'Show in Inventory?', value: item.inventory !== -1 ? 'Yes' : 'No', inline: true },
          { name: 'Time Remaining', value: timeRemainingString, inline: true },
          {
            name: 'Stock Remaining',
            value: item.stock !== -1 ? item.stock.toLocaleString() : 'Infinity',
            inline: true,
          },
          {
            name: 'Role Required',
            value: item.role_required
              ? interaction.client.util.getRole(interaction, item.role_required).toString()
              : 'None',
            inline: true,
          },
          {
            name: 'Role Given',
            value: item.role_given ? interaction.client.util.getRole(interaction, item.role_given).toString() : 'None',
            inline: true,
          },
          {
            name: 'Role Removed',
            value: item.role_removed
              ? interaction.client.util.getRole(interaction, item.role_removed).toString()
              : 'None',
            inline: true,
          },
          {
            name: 'Required Balance',
            value: interaction.client.util.limitStringLength(requiredBalance, 0, 1024),
            inline: true,
          },
          { name: 'Reply Message', value: item.reply_message || 'None', inline: true },
        ]);

      return interaction.editReply({ embeds: [embed] });
    }

    case 'leaderboard': {
      let page = interaction.options.getInteger('page') || 1;
      const itemName = interaction.options.getString('item');

      const [countRows] = await interaction.client.db.execute(
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
        [interaction.guild.id, itemName.toLowerCase()],
      );
      const totalEntries = countRows[0].count;

      if (totalEntries === 0) {
        return interaction.client.util.errorEmbed(interaction, `No one owns the item "${itemName}".`, 'Item Not Found');
      }

      const itemsPerPage = 10; // Number of entries per page
      const maxPages = Math.ceil(totalEntries / itemsPerPage) || 1;

      // Ensure the page is within range
      page = Math.max(1, Math.min(page, maxPages));

      const generateEmbed = async (currentPage) => {
        const offset = (currentPage - 1) * itemsPerPage;
        const [rows] = await interaction.client.db.execute(
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
          [interaction.guild.id, itemName.toLowerCase(), itemsPerPage, offset],
        );

        const leaderboardLines = await Promise.all(
          rows.map(async (row, index) => {
            const user =
              interaction.client.users.cache.get(row.user_id) ||
              (await interaction.client.users.fetch(row.user_id).catch(() => null));
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
          .setColor(interaction.settings.embedColor)
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
      break;
    }

    case 'sell': {
      const member = interaction.options.getUser('member');
      const quantity = interaction.options.getInteger('quantity') || 1;
      let itemName = interaction.options.getString('item').toLowerCase();
      const price = interaction.options.getInteger('price');

      const [inventoryRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_inventory
          WHERE
            server_id = ?
            AND user_id = ?
            AND LOWER(item_name) = ?
        `,
        [interaction.guild.id, interaction.member.id, itemName],
      );

      const sellerItem = inventoryRows[0];

      if (!sellerItem) {
        return interaction.client.util.errorEmbed(interaction, 'You do not have this item in your inventory.');
      }

      if (sellerItem.quantity < quantity) {
        return interaction.client.util.errorEmbed(
          interaction,
          'You do not have enough of this item in your inventory.',
        );
      }

      const [economyRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_settings
          WHERE
            server_id = ?
        `,
        [interaction.guild.id],
      );
      const currencySymbol = economyRows[0]?.symbol || '$';
      itemName = sellerItem.item_name;

      // Check buyer's balance
      const [balanceRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            cash
          FROM
            economy_balances
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [interaction.guild.id, member.id],
      );
      const buyerCash = BigInt(balanceRows[0]?.cash ?? economyRows[0]?.start_balance ?? 0);
      const totalCost = BigInt(price);
      if (buyerCash < totalCost) {
        return interaction.client.util.errorEmbed(interaction, `${member} cannot afford this.`, 'Insufficient Funds');
      }

      // Ask the buyer for confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
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

          // Update buyer's cash
          await interaction.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, cash)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE cash = cash -
              VALUES
                (cash)
            `,
            [interaction.guild.id, member.id, totalCost.toString()],
          );

          // Update seller's cash
          await interaction.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_balances (server_id, user_id, cash)
              VALUES
                (?, ?, ?) ON DUPLICATE KEY
              UPDATE cash = cash +
              VALUES
                (cash)
            `,
            [interaction.guild.id, interaction.member.id, totalCost.toString()],
          );

          // Update seller's inventory
          if (sellerItem.quantity > quantity) {
            await interaction.client.db.execute(
              /* sql */
              `
                UPDATE economy_inventory
                SET
                  quantity = quantity - ?
                WHERE
                  server_id = ?
                  AND user_id = ?
                  AND item_id = ?
                  AND item_name = ?
              `,
              [quantity, interaction.guild.id, interaction.user.id, sellerItem.item_id, sellerItem.item_name],
            );
          } else {
            await interaction.client.db.execute(
              /* sql */
              `
                DELETE FROM economy_inventory
                WHERE
                  server_id = ?
                  AND user_id = ?
                  AND item_id = ?
                  AND item_name = ?
              `,
              [interaction.guild.id, interaction.user.id, sellerItem.item_id, sellerItem.item_name],
            );
          }

          // Update buyer's inventory
          await interaction.client.db.execute(
            /* sql */
            `
              INSERT INTO
                economy_inventory (
                  server_id,
                  user_id,
                  item_id,
                  item_name,
                  quantity,
                  cost,
                  description,
                  inventory,
                  time_remaining,
                  role_required,
                  role_given,
                  role_removed,
                  reply_message
                )
              VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
              UPDATE quantity = quantity +
              VALUES
                (quantity),
                item_name =
              VALUES
                (item_name),
                cost =
              VALUES
                (cost),
                description =
              VALUES
                (description),
                inventory =
              VALUES
                (inventory),
                time_remaining =
              VALUES
                (time_remaining),
                role_required =
              VALUES
                (role_required),
                role_given =
              VALUES
                (role_given),
                role_removed =
              VALUES
                (role_removed),
                reply_message =
              VALUES
                (reply_message)
            `,
            [
              interaction.guild.id,
              member.id,
              sellerItem.item_id,
              sellerItem.item_name,
              quantity,
              sellerItem.cost,
              sellerItem.description,
              sellerItem.inventory,
              sellerItem.time_remaining,
              sellerItem.role_required,
              sellerItem.role_given,
              sellerItem.role_removed,
              sellerItem.reply_message,
            ],
          );

          // Send confirmation message
          const confirmEmbed = new EmbedBuilder()
            .setColor(interaction.settings.embedColor)
            .setDescription(
              `✅ Trade Complete \n${member} has received ${quantity} ${sellerItem.item_name}${
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
              `Cancelled the transaction of ${quantity} ${sellerItem.item_name}${
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

      const [economyRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            symbol
          FROM
            economy_settings
          WHERE
            server_id = ?
        `,
        [interaction.guild.id],
      );
      const currencySymbol = economyRows[0]?.symbol || '$';

      // Get total item count to calculate max pages
      const [countRows] = await interaction.client.db.execute(
        /* sql */
        `
          SELECT
            COUNT(*) AS count
          FROM
            economy_store
          WHERE
            server_id = ?
        `,
        [interaction.guild.id],
      );
      const totalItems = countRows[0].count;
      const itemsPerPage = 10;
      const maxPages = Math.ceil(totalItems / itemsPerPage) || 1;

      const generateStoreEmbed = async (currentPage) => {
        const offset = (currentPage - 1) * itemsPerPage;

        // Fetch only the items for the current page, sorted by cost
        const [rows] = await interaction.client.db.execute(
          /* sql */
          `
            SELECT
              item_name,
              cost,
              description
            FROM
              economy_store
            WHERE
              server_id = ?
            ORDER BY
              cost ASC
            LIMIT
              ?
            OFFSET
              ?
          `,
          [interaction.guild.id, itemsPerPage, offset],
        );

        const embed = new EmbedBuilder()
          .setColor(interaction.settings.embedColor)
          .setTitle(`${interaction.guild.name} Store`)
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
          .setFooter({ text: `Page ${currentPage} / ${maxPages}` })
          .setTimestamp();

        if (rows.length === 0) {
          embed.setDescription(stripIndents`
          The store is empty. Someone probably robbed it :shrug:
          Add items to the store using \`${interaction.settings.prefix}create-item\``);
        } else {
          const fields = rows.map((item) => {
            const formattedCost = currencySymbol + BigInt(item.cost).toLocaleString();
            return {
              name: `${interaction.client.util.limitStringLength(formattedCost, 0, 100)} - ${item.item_name}`,
              value: item.description || 'No description provided.',
              inline: false,
            };
          });
          embed.addFields(fields);
        }

        return embed;
      };

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const embed = await generateStoreEmbed(page);
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

        const updatedEmbed = await generateStoreEmbed(page);
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

      const [inventoryRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_inventory
          WHERE
            server_id = ?
            AND user_id = ?
            AND LOWER(item_name) = ?
        `,
        [interaction.guild.id, interaction.user.id, itemName],
      );

      if (inventoryRows.length === 0) {
        return interaction.client.util.errorEmbed(interaction, 'You do not have this item in your inventory.');
      }

      const item = inventoryRows[0];

      if (item.role_required) {
        const roleRequired = interaction.client.util.getRole(interaction, item.role_required);
        if (roleRequired) {
          // Check if the member has the role
          const hasRole = interaction.member.roles.cache.has(roleRequired.id);
          if (!hasRole) {
            return interaction.client.util.errorEmbed(
              interaction,
              `You do not have the required role **${roleRequired.name}** to use this item.`,
            );
          }
        }
      }

      const itemAmount = item.quantity - quantity;

      if (itemAmount < 0) {
        return interaction.client.util.errorEmbed(
          interaction,
          `You only have ${item.quantity} of this item in your inventory.`,
        );
      }

      if (item.quantity > quantity) {
        await interaction.client.db.execute(
          /* sql */
          `
            UPDATE economy_inventory
            SET
              quantity = quantity - ?
            WHERE
              server_id = ?
              AND user_id = ?
              AND item_id = ?
              AND item_name = ?
          `,
          [quantity, interaction.guild.id, interaction.user.id, item.item_id, item.item_name],
        );
      } else {
        await interaction.client.db.execute(
          /* sql */
          `
            DELETE FROM economy_inventory
            WHERE
              server_id = ?
              AND user_id = ?
              AND item_id = ?
              AND item_name = ?
          `,
          [interaction.guild.id, interaction.user.id, item.item_id, item.item_name],
        );
      }

      if (item.role_given) {
        const roleGiven = interaction.client.util.getRole(interaction, item.role_given);
        await interaction.member.roles.add(roleGiven).catch((error) => interaction.channel.send(error));
      }
      if (item.role_removed) {
        const roleRemoved = interaction.client.util.getRole(interaction, item.role_removed);
        await interaction.member.roles.remove(roleRemoved).catch((error) => interaction.channel.send(error));
      }
      if (!item.reply_message) {
        return interaction.editReply('👍');
      }

      // Replace Member
      // Calculate the duration since the member's account was created
      const memberCreatedDuration = Duration.fromMillis(Date.now() - interaction.user.createdAt.getTime())
        .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
        .toHuman({ maximumFractionDigits: 2, showZeros: false });

      // Format the member's account creation date
      const memberCreated = DateTime.fromMillis(interaction.user.createdAt.getTime()).toFormat('MMMM dd, yyyy');

      let replyMessage = item.reply_message
        .replace(/\{member\.id\}/gi, interaction.user.id)
        .replace(/\{member\.username\}/gi, interaction.user.username)
        .replace(/\{member\.tag\}/gi, interaction.user.tag)
        .replace(/\{member\.mention\}/gi, interaction.user)
        .replace(/\{member\.created\}/gi, memberCreated)
        .replace(/\{member\.created\.duration\}/gi, memberCreatedDuration);

      // Replace Server
      // Calculate the duration since the server was created
      const serverCreatedDuration = Duration.fromMillis(Date.now() - interaction.guild.createdAt.getTime())
        .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
        .toHuman({ maximumFractionDigits: 2, showZeros: false });

      // Format the server's creation date
      const serverCreated = DateTime.fromMillis(interaction.guild.createdAt.getTime()).toFormat('MMMM dd, yyyy');

      replyMessage = replyMessage
        .replace(/\{server\.id\}/gi, interaction.guild.id)
        .replace(/\{server\.name\}/gi, interaction.guild.name)
        .replace(/\{server\.members\}/gi, interaction.guild.memberCount.toLocaleString())
        .replace(/\{server\.created\}/gi, serverCreated)
        .replace(/\{server\.created\.duration\}/gi, serverCreatedDuration);

      const role =
        interaction.client.util.getRole(interaction, item.role_given) ||
        interaction.client.util.getRole(interaction, item.role_removed) ||
        interaction.client.util.getRole(interaction, item.role_required);

      if (role) {
        // Calculate the duration since the role was created
        const roleCreatedDuration = Duration.fromMillis(Date.now() - role.createdAt.getTime())
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        // Format the role's creation date
        const roleCreated = DateTime.fromMillis(role.createdAt.getTime()).toFormat('MMMM dd, yyyy');

        replyMessage = replyMessage
          .replace(/\{role\.id\}/gi, role.id)
          .replace(/\{role\.name\}/gi, role.name)
          .replace(/\{role\.mention\}/gi, role)
          .replace(/\{role\.members\}/gi, role.members.size.toLocaleString())
          .replace(/\{role\.created\}/gi, roleCreated)
          .replace(/\{role\.created\.duration\}/gi, roleCreatedDuration);
      }

      return interaction.editReply(replyMessage);
    }
  }
};
