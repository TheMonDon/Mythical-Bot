/* eslint-disable no-unused-vars */
const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
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

      // Find the item in the store regardless of case
      const itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName);

      const item = store[itemKey];
      if (!item) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
          .setColor(interaction.settings.embedErrorColor)
          .setDescription('There is not an item with that name.');

        return interaction.editReply({ embeds: [embed] });
      }

      await db.delete(`servers.${interaction.guild.id}.economy.store.${itemKey}`);
      if (cascade) {
        // Remove all instances of this item from user inventories
        const users = (await db.get(`servers.${interaction.guild.id}.users`)) || {};
        for (const userId in users) {
          const userInventory = users[userId].economy?.inventory || [];
          const updatedInventory = userInventory.filter(
            (inventoryItem) => inventoryItem.name.toLowerCase() !== itemKey.toLowerCase(),
          );
          users[userId].economy.inventory = updatedInventory;
          await db.set(`servers.${interaction.guild.id}.users.${userId}.economy.inventory`, updatedInventory);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('Item has been removed from the store.');

      if (cascade) {
        embed.addFields([
          {
            name: 'Cascade Deletion',
            value: `All instances of **${itemKey}** have been removed from user inventories.`,
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

      const store = (await db.get(`servers.${interaction.guild.id}.economy.store`)) || {};

      // Find the item in the store regardless of case
      let itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName.toLowerCase());

      if (!itemKey) {
        return interaction.client.util.errorEmbed(interaction, 'That item does not exist in the store.');
      }

      const item = store[itemKey];

      switch (attribute) {
        case 'name': {
          if (!newValue) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a new name.');
          }

          // Ensure the new name is not already taken
          const newItemKey = newValue.toLowerCase();
          if (Object.keys(store).find((key) => key.toLowerCase() === newItemKey)) {
            return interaction.client.util.errorEmbed(interaction, 'An item with that name already exists.');
          }

          // Update the item name
          store[newValue] = item;
          delete store[itemKey];
          itemKey = newValue; // Update the reference to the new item key
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

          item.cost = price;
          store[itemKey] = item;
          break;
        }

        case 'description': {
          if (!newValue) {
            item.description = 'None provided';
            store[itemKey] = item;
            break;
          }

          if (newValue.length > 1000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with the description under 1000 characters.',
            );
          }

          item.description = newValue.slice(0, 1000);
          store[itemKey] = item;
          break;
        }

        case 'inventory': {
          if (!newValue) {
            item.inventory = true; // Default to true if no value is provided
            store[itemKey] = item;
            break;
          }

          if (['yes', 'no'].includes(newValue.toLowerCase())) {
            item.inventory = newValue.toLowerCase() === 'yes';
            store[itemKey] = item;
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
            item.timeRemaining = null;
            store[itemKey] = item;
            break;
          }

          const timeLimit = parse(newValue);

          if (isNaN(timeLimit) || timeLimit === null) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a valid `duration` given.',
            );
          } else if (timeLimit < 600000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command again with a duration greater than 10 minutes.',
            );
          } else if (timeLimit > 315576000000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command again with a duration less than 10 years.',
            );
          }

          if (timeLimit === 0) {
            item.timeRemaining = null;
            store[itemKey] = item;
            break;
          }

          item.timeRemaining = Date.now() + timeLimit;
          store[itemKey] = item;
          break;
        }

        case 'stock': {
          if (!newValue) {
            item.stock = null;
            store[itemKey] = item;
            break;
          }

          if (['infinite', 'infinity'].includes(newValue.toLowerCase())) {
            item.stock = null;
            store[itemKey] = item;
            break;
          }

          const stock = parseInt(newValue);
          if (isNaN(stock) || stock < 0) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with a valid stock amount greater than zero.',
            );
          }

          item.stock = stock;
          store[itemKey] = item;
          break;
        }

        case 'role-required': {
          if (!newValue) {
            item.roleRequired = null;
            store[itemKey] = item;
            break;
          }

          const role = interaction.client.util.getRole(interaction, newValue);
          if (!role) {
            return interaction.client.util.errorEmbed(interaction, 'Please re-run the command with a valid role.');
          }

          item.roleRequired = role.id;
          store[itemKey] = item;
          break;
        }

        case 'role-given': {
          if (!newValue) {
            item.roleGiven = null;
            store[itemKey] = item;
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

          item.roleGiven = role.id;
          store[itemKey] = item;
          break;
        }

        case 'role-removed': {
          if (!newValue) {
            item.roleRemoved = null;
            store[itemKey] = item;
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

          item.roleRemoved = role.id;
          store[itemKey] = item;
          break;
        }

        case 'required-balance': {
          if (!newValue) {
            item.requiredBalance = null;
            store[itemKey] = item;
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

          item.requiredBalance = requiredBalance;
          store[itemKey] = item;
          break;
        }

        case 'reply-message': {
          if (!newValue) {
            item.replyMessage = null;
            store[itemKey] = item;
            break;
          }

          if (newValue.length > 1000) {
            return interaction.client.util.errorEmbed(
              interaction,
              'Please re-run the command with the reply-message under 1000 characters.',
            );
          }

          item.replyMessage = newValue;
          store[itemKey] = item;
          break;
        }

        default:
          return interaction.editReply(
            'Invalid attribute. You can only edit name, price, description, inventory, time-remaining, role-required, role-given, role-removed, required-balance or reply-message.',
          );
      }

      await db.set(`servers.${interaction.guild.id}.economy.store`, store);
      const timeRemainingString = item.timeRemaining
        ? `Deleted <t:${Math.floor(item.timeRemaining / 1000)}:R>`
        : 'No time limit';

      const embed = new EmbedBuilder()
        .setTitle('Item Edited')
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .addFields([
          { name: 'Name', value: itemKey, inline: true },
          { name: 'Price', value: BigInt(item.cost).toLocaleString(), inline: true },
          { name: 'Description', value: item.description, inline: false },
          { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
          { name: 'Time Remaining', value: timeRemainingString, inline: true },
          { name: 'Stock', value: item.stock ? item.stock.toLocaleString() : 'Infinity', inline: true },
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
          { name: 'Reply Message', value: item.replyMessage || 'None', inline: true },
        ])
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
