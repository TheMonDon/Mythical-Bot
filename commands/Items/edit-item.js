const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class EditItem extends Command {
  constructor(client) {
    super(client, {
      name: 'edit-item',
      category: 'Items',
      description: 'Edit an item in the store.',
      longDescription:
        'Available attributes: name, price, description, inventory, time-remaining, stock, role-required, role-given, role-removed, required-balance and reply-message. Leave the new value blank to remove the attribute.',
      usage: 'edit-item <attribute> <item name> [new value]',
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

    if (args[0].startsWith('"')) {
      // Find the ending index of the item name enclosed in double quotes
      const itemNameEndIndex = args.findIndex((arg) => arg.endsWith('"'));
      if (itemNameEndIndex === -1) {
        return this.client.util.errorEmbed(msg, 'Please enclose the item name in double quotes', 'Invalid Format');
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

    const [storeRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_store
        WHERE
          server_id = ?
          AND LOWER(item_name) = LOWER(?)
      `,
      [msg.guild.id, itemName],
    );

    const item = storeRows[0];

    if (!item) {
      return this.client.util.errorEmbed(msg, 'That item does not exist in the store.');
    }

    const updateStoreItem = async (itemId, column, value) => {
      item[column] = value;
      return await this.client.db.execute(
        /* sql */ `
          UPDATE economy_store
          SET
            ${column} = ?
          WHERE
            server_id = ?
            AND item_id = ?
        `,
        [value, msg.guild.id, itemId],
      );
    };

    switch (attribute) {
      case 'name': {
        if (!newValue) {
          return this.client.util.errorEmbed(msg, 'Please provide a new name for the item.');
        }

        if (newValue.length > 200) {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with a name under 200 characters.');
        }

        // Ensure the new name is not already taken
        const [countRows] = await this.client.db.execute(
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
          [msg.guild.id, newValue],
        );

        if (countRows[0].count > 0) {
          return this.client.util.errorEmbed(msg, 'An item with that name already exists in the store.');
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
          return this.client.util.errorEmbed(
            msg,
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
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command with the description under 1000 characters.',
          );
        }

        await updateStoreItem(item.item_id, 'description', newValue);
        break;
      }

      case 'inventoryitem':
      case 'inventory-item':
      case 'inventory': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'inventory', 1);
          break;
        }

        if ((this.client.util.yes || this.client.util.no).includes(newValue.toLowerCase())) {
          const inventoryValue = this.client.util.yes.includes(newValue.toLowerCase()) ? 1 : 0;
          await updateStoreItem(item.item_id, 'inventory', inventoryValue);
        } else {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with "yes" or "no" for inventory.');
        }
        break;
      }

      case 'duration':
      case 'timeremaining':
      case 'time-remaining': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'time_remaining', null);
          break;
        }

        const timeLimit = parse(newValue);

        if (isNaN(timeLimit) || timeLimit === null) {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with a valid `duration` given.');
        } else if (timeLimit < 600000) {
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command again with a duration greater than 10 minutes.',
          );
        } else if (timeLimit > 315576000000) {
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command again with a duration less than 10 years.',
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
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command with a valid stock amount greater than zero.',
          );
        }

        await updateStoreItem(item.item_id, 'stock', stock);
        break;
      }

      case 'rolerequired':
      case 'role-required': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'role_required', null);
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with a valid role.');
        }

        await updateStoreItem(item.item_id, 'role_required', role.id);
        break;
      }

      case 'rolegiven':
      case 'role-given': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'role_given', null);
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with a valid role.');
        } else if (role.position >= botMember.roles.highest.position) {
          return this.client.util.errorEmbed(
            msg,
            'I am not able to assign this role. Please move my role higher and re-run the command.',
          );
        }

        await updateStoreItem(item.item_id, 'role_given', role.id);
        break;
      }

      case 'roleremoved':
      case 'role-removed': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'role_removed', null);
          break;
        }

        const role = this.client.util.getRole(msg, newValue);
        if (!role) {
          return this.client.util.errorEmbed(msg, 'Please re-run the command with a valid role.');
        } else if (role.position >= botMember.roles.highest.position) {
          return this.client.util.errorEmbed(
            msg,
            'I am not able to remove this role. Please move my role higher and re-run the command.',
          );
        }

        await updateStoreItem(item.item_id, 'role_removed', role.id);
        break;
      }

      case 'requiredbalance':
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
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command with a number that is at least 0 for required-balance.',
          );
        }

        await updateStoreItem(item.item_id, 'required_balance', requiredBalance);
        break;
      }

      case 'replymessage':
      case 'reply-message':
      case 'reply': {
        if (!newValue) {
          await updateStoreItem(item.item_id, 'reply_message', null);
          break;
        }

        if (newValue.length > 1000) {
          return this.client.util.errorEmbed(
            msg,
            'Please re-run the command with the reply-message under 1000 characters.',
          );
        }

        await updateStoreItem(item.item_id, 'reply_message', newValue);
        break;
      }

      default:
        return msg.reply(
          'Invalid attribute. You can only edit name, price, description, inventory, time-remaining, role-required, role-given, role-removed, required-balance or reply-message.',
        );
    }

    const timeRemainingString = item.timeRemaining
      ? `Deleted <t:${Math.floor(item.timeRemaining / 1000)}:R>`
      : 'No time limit';

    const [economyRows] = await this.client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          economy_settings
        WHERE
          server_id = ?
      `,
      [msg.guild.id],
    );
    const currencySymbol = economyRows[0]?.symbol || '$';
    const costString = currencySymbol + BigInt(item.cost).toLocaleString();

    const embed = new EmbedBuilder()
      .setTitle('Item Edited')
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: item.item_name, inline: true },
        { name: 'Price', value: costString, inline: true },
        { name: 'Description', value: item.description, inline: false },
        { name: 'Show in Inventory?', value: item.inventory !== -1 ? 'Yes' : 'No', inline: true },
        { name: 'Time Remaining', value: timeRemainingString, inline: true },
        { name: 'Stock', value: item.stock !== -1 ? item.stock.toLocaleString() : 'Infinity', inline: true },
        {
          name: 'Role Required',
          value: item.role_required ? this.client.util.getRole(msg, item.role_required).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Given',
          value: item.role_given ? this.client.util.getRole(msg, item.role_given).toString() : 'None',
          inline: true,
        },
        {
          name: 'Role Removed',
          value: item.role_removed ? this.client.util.getRole(msg, item.role_removed).toString() : 'None',
          inline: true,
        },
        { name: 'Reply Message', value: item.reply_message || 'None', inline: true },
      ])
      .setTimestamp();

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = EditItem;
