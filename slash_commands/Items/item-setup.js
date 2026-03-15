/* eslint-disable no-unused-vars */
const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const attributes = [
  'name',
  'price',
  'description',
  'inventory',
  'time-remaining',
  'stock',
  'role-required',
  'role-given',
  'role-removed',
  'required-balance',
  'reply-message',
];

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('item-setup')
  .setDescription('Setup and manage items in the store.')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create an item to be shown in the store.')
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('A name for this item')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(200),
      )
      .addIntegerOption((option) =>
        option.setName('price').setDescription('The price to buy this item').setRequired(false),
      )
      .addStringOption((option) =>
        option.setName('description').setDescription('A description for this item').setRequired(false),
      )
      .addBooleanOption((option) =>
        option
          .setName('inventory')
          .setDescription('Show this item in the inventory (Default: True)')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('time_remaining')
          .setDescription('How long this item will be available for purchase (Default: Unlimited)')
          .setRequired(false),
      )
      .addIntegerOption((option) =>
        option.setName('stock').setDescription('The stock of this item (Default: Infinite)').setRequired(false),
      )
      .addRoleOption((option) =>
        option
          .setName('role-required')
          .setDescription('A role required to buy this item (Default: None)')
          .setRequired(false),
      )
      .addRoleOption((option) =>
        option
          .setName('role-given')
          .setDescription('A role given to the user after buying/using this item (Default: None)')
          .setRequired(false),
      )
      .addRoleOption((option) =>
        option
          .setName('role-removed')
          .setDescription('A role removed from the user after buying/using this item (Default: None)')
          .setRequired(false),
      )
      .addIntegerOption((option) =>
        option
          .setName('required-balance')
          .setDescription('Required balance to buy this item (Default: None)')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('reply-message')
          .setDescription(
            'Message shown when item is bought/used. Supports tags: mythical.cisn.xyz/tags (Default: None)',
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Delete an item from the store.')
      .addStringOption((option) =>
        option.setName('name').setDescription('The item you want to delete').setRequired(true).setAutocomplete(true),
      )
      .addBooleanOption((option) =>
        option.setName('cascade').setDescription('Delete all of this item from inventories').setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('edit')
      .setDescription('Edit an item in the store.')
      .addStringOption((option) =>
        option.setName('name').setDescription('The item to edit').setAutocomplete(true).setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('attribute')
          .setDescription('The attribute to edit')
          .addChoices(...attributes.map((attr) => ({ name: attr, value: attr })))
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('new_value')
          .setDescription('The new value (leave blank to remove/reset attribute)')
          .setRequired(false),
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
    case 'create': {
      const itemName = interaction.options.getString('name');
      const price = interaction.options.getInteger('price') || 0;
      const description = interaction.options.getString('description') || 'None provided';
      const inventory = interaction.options.getBoolean('inventory') || true;
      const timeRemaining = interaction.options.getString('time_remaining') || null;
      const stock = interaction.options.getString('stock') || 'infinite';
      const roleRequired = interaction.options.getRole('role-required')?.id || null;
      const roleGiven = interaction.options.getRole('role-given')?.id || null;
      const roleRemoved = interaction.options.getRole('role-removed')?.id || null;
      const requiredBalance = interaction.options.getInteger('required-balance') || null;
      const replyMessage = interaction.options.getString('reply-message') || null;
      const parse = (await import('parse-duration')).default;

      const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setColor(interaction.settings.embedColor)
        .setTimestamp();

      const wipEmbed = new EmbedBuilder()
        .setTitle('Command Unavailable')
        .setColor('#FF0000')
        .setDescription('This command is still a work in progress.')
        .setTimestamp();

      return interaction.editReply({ embeds: [wipEmbed] });
    }

    case 'delete': {
      const itemName = interaction.options.getString('name');
      const cascade = interaction.options.getBoolean('cascade') || false;

      const [storeRows] = await interaction.client.db.execute(
        /* sql */
        `
          SELECT
            item_id
          FROM
            economy_store
          WHERE
            server_id = ?
            AND LOWER(item_name) = LOWER(?)
        `,
        [interaction.guild.id, itemName],
      );

      if (storeRows.length === 0) {
        return interaction.client.util.errorEmbed(interaction, 'That item does not exist in the store.');
      }

      await interaction.client.db.execute(
        /* sql */ `
          DELETE FROM economy_store
          WHERE
            server_id = ?
            AND item_id = ?
        `,
        [interaction.guild.id, storeRows[0].item_id],
      );

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('Item has been removed from the store.');

      if (cascade) {
        // Remove all instances of this item from user inventories
        await interaction.client.db.execute(
          /* sql */ `
            DELETE FROM economy_inventory
            WHERE
              server_id = ?
              AND item_id = ?
          `,
          [interaction.guild.id, storeRows[0].item_id],
        );

        embed.addFields([
          {
            name: 'Cascade Deletion',
            value: `All instances of **${storeRows[0].item_name}** have been removed from user inventories.`,
          },
        ]);
      }

      return interaction.editReply({ embeds: [embed] });
    }

    case 'edit': {
      const parse = (await import('parse-duration')).default;
      const botMember = interaction.guild.members.cache.get(interaction.client.user.id);

      const itemName = interaction.options.getString('name');
      const attribute = interaction.options.getString('attribute');
      let newValue = interaction.options.getString('new_value');

      const [storeRows] = await interaction.client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            economy_store
          WHERE
            server_id = ?
            AND LOWER(item_name) = LOWER(?)
        `,
        [interaction.guild.id, itemName],
      );

      const item = storeRows[0];

      if (!item) {
        return interaction.client.util.errorEmbed(interaction, 'That item does not exist in the store.');
      }

      const updateStoreItem = async (itemId, column, value) => {
        item[column] = value;
        return await interaction.client.db.execute(
          /* sql */ `
            UPDATE economy_store
            SET
              ${column} = ?
            WHERE
              server_id = ?
              AND item_id = ?
          `,
          [value, interaction.guild.id, itemId],
        );
      };

      switch (attribute) {
        case 'name': {
          if (!newValue) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a new name.');
          }

          if (newValue.length > 200) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a name under 200 characters.',
            );
          }

          // Ensure the new name is not already taken
          const [countRows] = await interaction.client.db.execute(
            /* sql */
            `
              SELECT
                COUNT(*) AS count
              FROM
                economy_store
              WHERE
                server_id = ?
                AND LOWER(item_name) = LOWER(?)
            `,
            [interaction.guild.id, newValue],
          );

          if (countRows[0].count > 0) {
            return interaction.client.util.errorEmbed(
              interaction,
              'An item with that name already exists in the store, please re-run the command with a different name.',
            );
          }

          await updateStoreItem(item.item_id, 'item_name', newValue);
          break;
        }

        case 'price': {
          if (!newValue) {
            newValue = '0'; // Default to 0 if no value is provided
          }

          const price = parseInt(
            newValue
              .replace(/\..*/, '') // Remove everything after the first period
              .replace(/[^0-9,]/g, '') // Keep only digits and commas
              .replace(/,/g, ''), // Remove commas
          );

          if (isNaN(price) || price < 0) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a price that is a number and above zero.',
            );
          }

          await updateStoreItem(item.item_id, 'cost', price);
          break;
        }

        case 'description': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'description', '<:transparent:1482197803999428709>');
            break;
          }

          if (newValue.length > 1000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with the description under 1000 characters.',
            );
          }

          await updateStoreItem(item.item_id, 'description', newValue);
          break;
        }

        case 'inventory': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'inventory', 1);
            break;
          }

          if ((interaction.client.util.yes || interaction.client.util.no).includes(newValue.toLowerCase())) {
            const inventoryValue = interaction.client.util.yes.includes(newValue.toLowerCase()) ? 1 : 0;
            await updateStoreItem(item.item_id, 'inventory', inventoryValue);
          } else {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with "yes" or "no" for inventory.',
            );
          }
          break;
        }

        case 'time-remaining': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'time_remaining', null);
            break;
          }

          const timeLimit = parse(newValue);

          if (isNaN(timeLimit) || timeLimit === null) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a valid `time-remaining` given.',
            );
          } else if (timeLimit < 600000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command again with a `time-remaining` greater than 10 minutes.',
            );
          } else if (timeLimit > 315576000000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command again with a `time-remaining` less than 10 years.',
            );
          }

          if (timeLimit === 0) {
            await updateStoreItem(item.item_id, 'time_remaining', null);
            break;
          }

          const newTimeRemaining = Date.now() + timeLimit;
          await updateStoreItem(item.item_id, 'time_remaining', newTimeRemaining);
          break;
        }

        case 'stock': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'stock', -1);
            break;
          }

          if (['infinite', 'infinity'].includes(newValue.toLowerCase())) {
            await updateStoreItem(item.item_id, 'stock', -1);
            break;
          }

          const stock = parseInt(newValue);
          if (isNaN(stock) || stock < 0) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a valid stock amount greater than zero. You can also use "infinite" for unlimited stock.',
            );
          }

          await updateStoreItem(item.item_id, 'stock', stock);
          break;
        }

        case 'role-required': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'role_required', null);
            break;
          }

          const role = interaction.client.util.getRole(interaction, newValue);
          if (!role) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a valid role.');
          }

          await updateStoreItem(item.item_id, 'role_required', role.id);
          break;
        }

        case 'role-given': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'role_given', null);
            break;
          }

          const role = interaction.client.util.getRole(interaction, newValue);
          if (!role) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a valid role.');
          } else if (role.position >= botMember.roles.highest.position) {
            return interaction.client.util.errorEmbed(
              interaction,
              'I am not able to assign this role. Please move my role higher and re-run the command.',
            );
          }

          await updateStoreItem(item.item_id, 'role_given', role.id);
          break;
        }

        case 'role-removed': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'role_removed', null);
            break;
          }

          const role = interaction.client.util.getRole(interaction, newValue);
          if (!role) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a valid role.');
          } else if (role.position >= botMember.roles.highest.position) {
            return interaction.client.util.errorEmbed(
              interaction,
              'I am not able to remove this role. Please move my role higher and re-run the command.',
            );
          }

          await updateStoreItem(item.item_id, 'role_removed', role.id);
          break;
        }

        case 'required-balance': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'required_balance', '0');
            break;
          }

          const requiredBalance = parseInt(
            newValue
              .replace(/\..*/, '') // Remove everything after the first period
              .replace(/[^0-9,]/g, '') // Keep only digits and commas
              .replace(/,/g, ''), // Remove commas
          );
          if (isNaN(requiredBalance) || requiredBalance < 0) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a number that is at least 0 for required-balance.',
            );
          }

          await updateStoreItem(item.item_id, 'required_balance', requiredBalance);
          break;
        }

        case 'reply-message': {
          if (!newValue) {
            await updateStoreItem(item.item_id, 'reply_message', null);
            break;
          }

          if (newValue.length > 1000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with the reply-message under 1000 characters.',
            );
          }

          await updateStoreItem(item.item_id, 'reply_message', newValue);
          break;
        }

        default:
          return interaction.editReply(
            'Invalid attribute. You can only edit name, price, description, inventory, time-remaining, role-required, role-given, role-removed, required-balance or reply-message.',
          );
      }

      const timeRemainingString = item.timeRemaining
        ? `Deleted <t:${Math.floor(item.timeRemaining / 1000)}:R>`
        : 'No time limit';

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
      const costString = currencySymbol + BigInt(item.cost).toLocaleString();

      const embed = new EmbedBuilder()
        .setTitle('Item Edited')
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .addFields([
          { name: 'Name', value: item.item_name, inline: true },
          { name: 'Price', value: costString, inline: true },
          { name: 'Description', value: item.description, inline: false },
          { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
          { name: 'Time Remaining', value: timeRemainingString, inline: true },
          { name: 'Stock', value: item.stock !== -1 ? item.stock.toLocaleString() : 'Infinity', inline: true },
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
          { name: 'Reply Message', value: item.reply_message || 'None', inline: true },
        ])
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
