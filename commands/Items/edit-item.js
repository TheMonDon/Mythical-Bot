/* eslint-disable no-case-declarations */
const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class EditItem extends Command {
  constructor(client) {
    super(client, {
      name: 'edit-item',
      category: 'Items',
      description: 'Edit an item in the store.',
      longDescription:
        'Available attributes: name, price, description, inventory, time-remaining, stock, role-required, role-given, role-removed, required-balance and reply',
      usage: 'edit-item <attribute> "<item name>" [new value]',
      aliases: ['edititem'],
      permLevel: 'Administrator',
      examples: ['edit-item name pizzza pizza', 'edit-item price "Large Crate" 100', 'edit-item time-remaining pizza'],
      guildOnly: true,
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const attribute = args.shift().toLowerCase();
    const parse = (await import('parse-duration')).default;
    const botMember = msg.guild.members.cache.get(this.client.user.id);
    let itemName;
    let newValue;

    const errorEmbed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });

    if (args[0].startsWith('"')) {
      // Find the ending index of the item name enclosed in double quotes
      const itemNameEndIndex = args.findIndex((arg) => arg.endsWith('"'));
      if (itemNameEndIndex === -1) {
        errorEmbed.setDescription('Please enclose the item name in double quotes.');
        return msg.channel.send({ embeds: [errorEmbed] });
      }

      // Extract the item name and remove the double quotes
      itemName = args
        .slice(0, itemNameEndIndex + 1)
        .join(' ')
        .replace(/"/g, '');
      newValue = args.slice(itemNameEndIndex + 1).join(' ');
    } else {
      // The first argument is the item name without spaces
      itemName = args.shift();
      newValue = args.join(' ');
    }

    // Proceed with using itemName and newValue

    const store = (await db.get(`servers.${msg.guild.id}.economy.store`)) || {};

    // Find the item in the store regardless of case
    let itemKey = Object.keys(store).find((key) => key.toLowerCase() === itemName.toLowerCase());

    if (!itemKey) {
      errorEmbed.setDescription('That item does not exist in the store.');
      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const item = store[itemKey];

    switch (attribute) {
      case 'name': {
        // Ensure the new name is not already taken
        const newItemKey = newValue.toLowerCase();
        if (Object.keys(store).find((key) => key.toLowerCase() === newItemKey)) {
          errorEmbed.setDescription('An item with that name already exists.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        // Update the item name
        store[newValue] = item;
        delete store[itemKey];
        itemKey = newValue; // Update the reference to the new item key
        break;
      }

      case 'price': {
        const price = parseInt(
          newValue
            .replace(/\..*/, '') // Remove everything after the first period
            .replace(/[^0-9,]/g, '') // Keep only digits and commas
            .replace(/,/g, ''), // Remove commas
        );

        if (isNaN(price) || price < 0) {
          errorEmbed.setDescription('Please re-run the command with a price that is a number and above zero.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.cost = price;
        store[itemKey] = item;
        break;
      }

      case 'description': {
        if (newValue.length > 1000) {
          errorEmbed.setDescription('Please re-run the command with the description under 1000 characters.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.description = newValue.slice(0, 1000);
        store[itemKey] = item;
        break;
      }

      case 'inventory': {
        if (['yes', 'no'].includes(newValue.toLowerCase())) {
          item.inventory = newValue.toLowerCase() === 'yes';
          store[itemKey] = item;
        } else {
          errorEmbed.setDescription('Please re-run the command with "yes" or "no" for inventory.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }
        break;
      }

      case 'timeremaining':
      case 'time-remaining': {
        if (!newValue) {
          item.timeRemaining = null;
          store[itemKey] = item;
          break;
        }

        const timeLimit = parse(newValue);

        if (isNaN(timeLimit) || timeLimit === null) {
          errorEmbed.setDescription('Please re-run the command with a valid `duration` given.');
          return msg.channel.send({ embeds: [errorEmbed] });
        } else if (timeLimit < 600000) {
          errorEmbed.setDescription('Please re-run the command again with a duration greater than 10 minutes.');
          return msg.channel.send({ embeds: [errorEmbed] });
        } else if (timeLimit > 315576000000) {
          errorEmbed.setDescription('Please re-run the command again with a duration less than 10 years.');
          return msg.channel.send({ embeds: [errorEmbed] });
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
          errorEmbed.setDescription('Please re-run the command with a valid stock amount greater than zero.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.stock = stock;
        store[itemKey] = item;
        break;
      }

      case 'rolerequired':
      case 'role-required': {
        if (!newValue) {
          item.roleRequired = null;
          store[itemKey] = item;
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          errorEmbed.setDescription('Please re-run the command with a valid role.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.roleRequired = role.id;
        store[itemKey] = item;
        break;
      }

      case 'rolegiven':
      case 'role-given': {
        if (!newValue) {
          item.roleGiven = null;
          store[itemKey] = item;
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          errorEmbed.setDescription('Please re-run the command with a valid role.');
          return msg.channel.send({ embeds: [errorEmbed] });
        } else if (role.position >= botMember.roles.highest.position) {
          errorEmbed.setDescription('I am not able to assign this role. Please move my role higher.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.roleGiven = role.id;
        store[itemKey] = item;
        break;
      }

      case 'roleremoved':
      case 'role-removed': {
        if (!newValue) {
          item.roleRemoved = null;
          store[itemKey] = item;
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          errorEmbed.setDescription('Please re-run the command with a valid role.');
          return msg.channel.send({ embeds: [errorEmbed] });
        } else if (role.position >= botMember.roles.highest.position) {
          errorEmbed.setDescription(
            'I am not able to assign this role. Please move my role higher and re-run the command.',
          );
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.roleRemoved = role.id;
        store[itemKey] = item;
        break;
      }

      case 'requiredbalance':
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
          errorEmbed.setDescription('Please re-run the command with a number that is above 0 for required-balance.');
          return msg.channel.send({ embeds: [errorEmbed] });
        }

        item.requiredBalance = requiredBalance;
        store[itemKey] = item;
        break;
      }

      case 'reply-message':
      case 'reply': {
        if (!newValue) {
          item.replyMessage = null;
          store[itemKey] = item;
          break;
        }

        item.replyMessage = newValue.slice(0, 1000);
        store[itemKey] = item;
        break;
      }

      default:
        return msg.reply(
          'Invalid attribute. You can only edit name, price, description, inventory, time-remaining, role-required, role-given, role-removed, required-balance or reply-message.',
        );
    }

    await db.set(`servers.${msg.guild.id}.economy.store`, store);
    const timeRemainingString = item.timeRemaining ? `Deleted <t:${item.timeRemaining}:R>` : 'No time limit';

    const embed = new EmbedBuilder()
      .setTitle('Item Edited')
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: itemKey, inline: true },
        { name: 'Price', value: BigInt(item.cost).toLocaleString(), inline: true },
        { name: 'Description', value: item.description, inline: false },
        { name: 'Show in Inventory?', value: item.inventory ? 'Yes' : 'No', inline: true },
        { name: 'Time Remaining', value: timeRemainingString, inline: true },
        { name: 'Stock', value: item.stock ? item.stock.toLocaleString() : 'Infinity', inline: true },
        {
          name: 'Role Required',
          value: item.roleRequired ? this.client.util.getRole(msg, item.roleRequired).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Given',
          value: item.roleGiven ? this.client.util.getRole(msg, item.roleGiven).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Removed',
          value: item.roleRemoved ? this.client.util.getRole(msg, item.roleRemoved).toString() : 'None',
          inline: true,
        },
        { name: 'Reply Message', value: item.replyMessage || 'None', inline: true },
      ])
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = EditItem;
